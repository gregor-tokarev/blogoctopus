<script setup lang="ts">
import {
  Cable,
  Clock,
  Newspaper,
  LogOut,
  User2,
  ChevronUp,
} from "lucide-vue-next";
import { authClient } from "~/lib/auth-client";

// Menu items.
const items = [
  {
    title: "Посты",
    url: "/dashboard/posts",
    icon: Newspaper,
  },
  {
    title: "Запланированные",
    url: "#",
    icon: Clock,
  },
  {
    title: "Интеграции",
    url: "/dashboard/integration",
    icon: Cable,
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
