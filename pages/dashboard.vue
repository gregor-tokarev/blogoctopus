<template>
  <SidebarProvider>
    <AppSidebar />
    <main>
      <NuxtPage />
    </main>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { SidebarProvider } from "@/components/ui/sidebar"
import AppSidebar from "@/components/dashboard/AppSidebar.vue"
</script>