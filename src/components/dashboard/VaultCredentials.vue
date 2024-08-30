<template>
  <div class="credentials">
    <h2>Manage Credentials for {{ vaultName }}</h2>
    <p-button label="Add Credential" icon="pi pi-plus" @click="openCreateCredentialDialog" />

    <p-data-table
      class="data-table-container"
      :value="credentials"
      paginator
      :rows="10"
      :emptyMessage="'No credentials found'"
    >
      <p-column field="website" header="Website"></p-column>
      <p-column field="username" header="Username"></p-column>
      <p-column field="note" header="Note"></p-column>
      <p-column header="Actions">
        <template #body="slotProps">
          <p-button icon="pi pi-pencil" @click="startEditCredential(slotProps.data)" />
          <p-button icon="pi pi-trash" @click="confirmDelete(slotProps.data)" />
        </template>
      </p-column>
    </p-data-table>

    <p-dialog
      header="Create Credential"
      v-model:visible="showCreateCredentialDialog"
      :modal="true"
      @hide="resetCredentialForm"
    >
      <p-input-text v-model="newCredential.website" placeholder="Website"></p-input-text>
      <p-input-text v-model="newCredential.username" placeholder="Username"></p-input-text>
      <p-password v-model="newCredential.password" placeholder="Password"></p-password>
      <p-input-textarea v-model="newCredential.note" placeholder="Note"></p-input-textarea>
      <p-button label="Create" icon="pi pi-check" @click="createCredential"></p-button>
    </p-dialog>

    <p-dialog
      header="Edit Credential"
      v-model:visible="showEditCredentialDialog"
      :modal="true"
      @hide="resetCredentialForm"
    >
      <p-input-text v-model="editCredential.website" placeholder="Website"></p-input-text>
      <p-input-text v-model="editCredential.username" placeholder="Username"></p-input-text>
      <p-password v-model="editCredential.password" placeholder="Password"></p-password>
      <p-input-textarea v-model="editCredential.note" placeholder="Note"></p-input-textarea>
      <p-button label="Save" icon="pi pi-save" @click="updateCredential"></p-button>
    </p-dialog>

    <p-confirm-dialog
      v-model:visible="showConfirmDialog"
      :header="'Confirm Deletion'"
      message="Are you sure you want to delete this credential?"
      icon="pi pi-exclamation-triangle"
      acceptLabel="Yes"
      rejectLabel="No"
      accept="deleteCredential"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import axios from '@/axios-config'
import { useRoute } from 'vue-router'

interface Credential {
  id: string
  website: string
  username: string
  password: string
  note: string
}

export default defineComponent({
  setup() {
    const route = useRoute()
    const vaultId = route.params.vaultId as string
    const vaultName = ref('')
    const credentials = ref<Credential[]>([])
    const showCreateCredentialDialog = ref(false)
    const showEditCredentialDialog = ref(false)
    const showConfirmDialog = ref(false)
    const selectedCredentialId = ref<string | null>(null)

    const newCredential = ref<Omit<Credential, 'id'>>({
      website: '',
      username: '',
      password: '',
      note: ''
    })

    const editCredential = ref<Credential>({
      id: '',
      website: '',
      username: '',
      password: '',
      note: ''
    })

    const fetchCredentials = async () => {
      try {
        const response = await axios.get(`/api/vaults/${vaultId}/credentials`)
        if (response.data.credentials) {
          credentials.value = response.data.credentials
          vaultName.value = response.data.vaultName
        }
      } catch (error) {
        console.error('Failed to fetch credentials:', error)
      }
    }

    const openCreateCredentialDialog = () => {
      resetCredentialForm()
      showCreateCredentialDialog.value = true
    }

    const createCredential = async () => {
      try {
        const response = await axios.post<Credential>(
          `/api/vaults/${vaultId}/credentials`,
          newCredential.value
        )
        credentials.value.push(response.data)
        showCreateCredentialDialog.value = false
      } catch (error) {
        console.error('Failed to create credential:', error)
      }
    }

    const startEditCredential = (credential: Credential) => {
      editCredential.value = { ...credential }
      showEditCredentialDialog.value = true
    }

    const updateCredential = async () => {
      try {
        const response = await axios.put<Credential>(
          `/api/vaults/${vaultId}/credentials/${editCredential.value.id}`,
          editCredential.value
        )
        const index = credentials.value.findIndex((c) => c.id === editCredential.value.id)
        if (index !== -1) {
          credentials.value[index] = response.data
        }
        showEditCredentialDialog.value = false
      } catch (error) {
        console.error('Failed to update credential:', error)
      }
    }

    const confirmDelete = (credential: Credential) => {
      selectedCredentialId.value = credential.id
      showConfirmDialog.value = true
    }

    const deleteCredential = async () => {
      if (!selectedCredentialId.value) return
      try {
        await axios.delete(`/api/vaults/${vaultId}/credentials/${selectedCredentialId.value}`)
        credentials.value = credentials.value.filter((c) => c.id !== selectedCredentialId.value)
        showConfirmDialog.value = false
      } catch (error) {
        console.error('Failed to delete credential:', error)
      }
    }

    const resetCredentialForm = () => {
      newCredential.value = { website: '', username: '', password: '', note: '' }
      editCredential.value = { id: '', website: '', username: '', password: '', note: '' }
    }

    onMounted(() => {
      fetchCredentials()
    })

    return {
      vaultName,
      credentials,
      showCreateCredentialDialog,
      showEditCredentialDialog,
      showConfirmDialog,
      newCredential,
      editCredential,
      openCreateCredentialDialog,
      createCredential,
      startEditCredential,
      updateCredential,
      confirmDelete,
      deleteCredential,
      resetCredentialForm
    }
  }
})
</script>

<style scoped>
.credentials {
  padding: 2rem;
}

.p-button {
  margin-bottom: 1rem;
}
</style>
