import Login from '@/components/auth/Login.vue'
import Register from '@/components/auth/Register.vue'
import Audit from '@/components/dashboard/Audit.vue'
import Notifications from '@/components/dashboard/Notifications.vue'
import Overview from '@/components/dashboard/Overview.vue'
import Profile from '@/components/dashboard/Profile.vue'
import Vaults from '@/components/dashboard/Vaults.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { isLoggedIn } from '@/stores/authStore'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/overview'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    beforeEnter: (to, from, next) => {
      if (isLoggedIn()) {
        next('/')
      } else {
        next()
      }
    }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    beforeEnter: (to, from, next) => {
      if (isLoggedIn()) {
        next('/')
      } else {
        next()
      }
    }
  },
  {
    path: '/totp-verification',
    name: 'TOTPVerification',
    component: () => import('@/components/auth/TOTPVerificationView.vue'),
    meta: {
      requiresAuth: false,
      title: 'Verify Two-Factor Authentication'
    }
  },
  {
    path: '/',
    component: MainLayout,
    name: 'MainLayout',
    meta: {
      requiresAuth: true
    },
    children: [
      {
        path: 'overview',
        name: 'Overview',
        component: Overview
      },
      {
        path: 'profile',
        name: 'Profile',
        component: Profile
      },
      {
        path: 'vaults',
        name: 'Vaults',
        component: Vaults
      },
      {
        path: '/domains',
        name: 'domains',
        component: () => import('@/components/dashboard/Domain.vue'),
        meta: {
          requiresAuth: true
        }
      },
      {
        path: 'vaults/:vaultId/credentials',
        name: 'VaultCredentials',
        component: () => import('@/components/dashboard/VaultCredentials.vue')
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: Notifications
      },
      {
        path: 'audit',
        name: 'Audit',
        component: Audit
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!isLoggedIn()) {
      next({ name: 'Login' })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
