<script setup lang="ts">
import { Cable, Clock, Plus } from "lucide-vue-next"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuAction
} from "@/components/ui/sidebar"

// Menu items.
const items = [
    {
        title: "Интеграции",
        url: "#",
        icon: Cable,
    },
    {
        title: "Запланированные",
        url: "#",
        icon: Clock,
    },
];
</script>

<template>
    <Sidebar>
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem v-for="item in items" :key="item.title">
                            <SidebarMenuButton asChild>
                                <a :href="item.url">
                                    <component :is="item.icon" />
                                    <span>{{ item.title }}</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
                <SidebarGroupContent>
                    <UiButton size="xs" variant="default" class="w-full">
                        <Plus />Новая публикация
                    </UiButton>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
    </Sidebar>
</template>