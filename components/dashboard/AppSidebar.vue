<script setup lang="ts">
import { Cable, Clock, Plus, LogOut, User2, ChevronUp } from "lucide-vue-next";
import { authClient } from "~/lib/auth-client";

// Menu items.
const items = [
  {
    title: "Интеграции",
    url: "/dashboard/integration",
    icon: Cable,
  },
  {
    title: "Запланированные",
    url: "#",
    icon: Clock,
  },
];

const session = authClient.useSession();

const router = useRouter();

function logout() {
  authClient.signOut();
  router.push("/auth");
}
</script>

<template>
  <UiSidebar>
    <UiSidebarContent>
      <UiSidebarGroup>
        <UiSidebarGroupContent>
          <UiSidebarMenu>
            <UiSidebarMenuItem v-for="item in items" :key="item.title">
              <UiSidebarMenuButton asChild>
                <a :href="item.url">
                  <component :is="item.icon" />
                  <span>{{ item.title }}</span>
                </a>
              </UiSidebarMenuButton>
            </UiSidebarMenuItem>
          </UiSidebarMenu>
        </UiSidebarGroupContent>
      </UiSidebarGroup>
      <UiSidebarGroup>
        <UiSidebarGroupContent>
          <NuxtLink to="/dashboard/new-post" class="w-full">
            <UiButton size="xs" variant="default" class="w-full">
              <Plus />Новая публикация
            </UiButton>
          </NuxtLink>
        </UiSidebarGroupContent>
      </UiSidebarGroup>
    </UiSidebarContent>
    <UiSidebarFooter>
      <UiSidebarMenu>
        <UiSidebarMenuItem>
          <UiDropdownMenu>
            <UiDropdownMenuTrigger asChild>
              <UiSidebarMenuButton class="cursor-pointer">
                <User2 class="mr-2 size-4" />
                <span class="truncate">{{ session.data?.user?.email }}</span>
                <ChevronUp class="size-4 ml-auto" />
              </UiSidebarMenuButton>
            </UiDropdownMenuTrigger>
            <UiDropdownMenuContent side="top" class="w-56">
              <UiDropdownMenuItem @click="logout()">
                <LogOut class="mr-2 size-4" />
                Выйти
              </UiDropdownMenuItem>
            </UiDropdownMenuContent>
          </UiDropdownMenu>
        </UiSidebarMenuItem>
      </UiSidebarMenu>
    </UiSidebarFooter>
  </UiSidebar>
</template>
