<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="vaults">
    <h2>Manage Your Vaults</h2>
    <p-button label="Add Vault" icon="pi pi-plus" @click="showCreateVaultDialog = true"></p-button>

    <p-data-table
      class="data-table-container"
      :value="vaults"
      paginator
      :rows="10"
      :emptyMessage="'No vaults found'"
    >
      <p-column field="name" header="Name"></p-column>
      <p-column field="description" header="Description"></p-column>
      <p-column field="numberOfCredentials" header="Credentials"></p-column>
      <p-column header="Actions">
        <template #body="slotProps">
          <p-button icon="pi pi-pencil" @click="startEditVault(slotProps.data)" />
          <p-button icon="pi pi-trash" @click="confirmDelete(slotProps.data)" />
          <p-button icon="pi pi-eye" @click="goToVaultCredentials(slotProps.data.id)" />
        </template>
      </p-column>
    </p-data-table>

    <p-dialog
      class="vault-dialog"
      header="Create Vault"
      v-model:visible="showCreateVaultDialog"
      :modal="true"
    >
      <div class="input-field">
        <label for="create-vault-name">Vault Name</label>
        <p-input-text id="create-vault-name" v-model="newVault.name"> </p-input-text>
      </div>
      <div class="input-field">
        <label for="create-vault-description">Description</label>
        <p-textarea
          id="create-vault-description"
          class="input-field"
          v-model="newVault.description"
          autoResize
          rows="5"
        ></p-textarea>
      </div>
      <p-button label="Create" icon="pi pi-check" @click="createVault()"></p-button>
    </p-dialog>

    <p-dialog
      class="vault-dialog"
      header="Edit Vault"
      v-model:visible="showEditVaultDialog"
      :modal="true"
    >
      <p-input-text
        id="edit-vault-name"
        class="input-field"
        v-model="editVault.name"
        placeholder="Vault Name"
        ><label for="edit-vault-name">Vault Name</label></p-input-text
      >
      <p-textarea
        id="edit-vault-description"
        class="input-field"
        v-model="editVault.description"
        autoResize
        rows="5"
        placeholder="Description"
        ><label for="edit-vault-description">Description</label></p-textarea
      >
      <p-button label="Save" icon="pi pi-save" @click="updateVault()"></p-button>
    </p-dialog>

    <p-confirm-dialog
      v-model:visible="showConfirmDialog"
      :header="'Confirm Deletion'"
      message="Are you sure you want to delete this vault?"
      icon="pi pi-exclamation-triangle"
      acceptLabel="Yes"
      rejectLabel="No"
      accept="deleteVault"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Vault } from './../../models/vault'
import axios from './../../axios-config'

export default defineComponent({
  setup() {
    const router = useRouter()
    const vaults = ref<Vault[]>([])
    const showCreateVaultDialog = ref(false)
    const showEditVaultDialog = ref(false)
    const showConfirmDialog = ref(false)
    const selectedVaultId = ref<string | null>(null)

    const newVault = ref<Omit<Vault, 'id' | 'numberOfCredentials'>>({ name: '', description: '' })
    const editVault = ref<Omit<Vault, 'numberOfCredentials'>>({ id: '', name: '', description: '' })

    const fetchVaults = async () => {
      try {
        const response = await axios.get<Vault[]>('/api/vaults')
        if (Array.isArray(response.data)) {
          vaults.value = response.data.filter((vault) => vault && vault.id)
        } else {
          console.error('Unexpected response data:', response.data)
          vaults.value = []
        }
      } catch (error) {
        console.error('Failed to fetch vaults:', error)
        vaults.value = []
      }
    }

    const createVault = async () => {
      try {
        const response = await axios.post<Vault>('/api/vaults', newVault.value)
        vaults.value.push(response.data)
        showCreateVaultDialog.value = false
        newVault.value = { name: '', description: '' }
      } catch (error) {
        console.error('Failed to create vault:', error)
      }
    }

    const startEditVault = (vault: Vault) => {
      editVault.value = { ...vault }
      showEditVaultDialog.value = true
    }

    const updateVault = async () => {
      try {
        const response = await axios.put<Vault>(
          `/api/vaults/${editVault.value.id}`,
          editVault.value
        )
        const index = vaults.value.findIndex((v) => v.id === editVault.value.id)
        if (index !== -1) {
          vaults.value[index] = response.data
        }
        showEditVaultDialog.value = false
      } catch (error) {
        console.error('Failed to update vault:', error)
      }
    }

    const confirmDelete = (vault: Vault) => {
      selectedVaultId.value = vault.id
      showConfirmDialog.value = true
    }

    const deleteVault = async () => {
      if (!selectedVaultId.value) return
      try {
        await axios.delete(`/api/vaults/${selectedVaultId.value}`)
        vaults.value = vaults.value.filter((v) => v.id !== selectedVaultId.value)
        showConfirmDialog.value = false
      } catch (error) {
        console.error('Failed to delete vault:', error)
      }
    }

    const goToVaultCredentials = (vaultId: string) => {
      router.push(`/vaults/${vaultId}/credentials`)
    }

    onMounted(() => {
      fetchVaults()
    })

    return {
      vaults,
      showCreateVaultDialog,
      showEditVaultDialog,
      showConfirmDialog,
      newVault,
      editVault,
      createVault,
      startEditVault,
      updateVault,
      confirmDelete,
      deleteVault,
      goToVaultCredentials
    }
  }
})
</script>

<style scoped>
.vaults {
  padding: 2rem;
}

.p-button {
  margin-bottom: 1rem;
}
</style>
