<template>
  <SidebarProvider>
    <AppSidebar />
    <main>
      <SidebarTrigger />
      <NuxtPage />
    </main>
  </SidebarProvider>
</template>

<script setup lang="ts">
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import AppSidebar from "@/components/dashboard/AppSidebar.vue"
</script>