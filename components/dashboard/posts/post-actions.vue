<script setup lang="ts">
import type { InferSelectModel } from "drizzle-orm";
import { posts } from "~/server/schema";
import { Pencil, Trash, Calendar, MoreVertical } from "lucide-vue-next";

type Post = InferSelectModel<typeof posts>;

const props = defineProps<{
  post: Post;
}>();

const emit = defineEmits<{
  (e: "delete", id: string): void;
  (e: "reschedule", id: string): void;
  (e: "edit", id: string): void;
}>();
</script>

<template>
  <UiDropdownMenu>
    <UiDropdownMenuTrigger asChild>
      <UiButton variant="ghost" size="icon" class="h-8 w-8 p-0">
        <span class="sr-only">Открыть меню</span>
        <MoreVertical class="h-4 w-4" />
      </UiButton>
    </UiDropdownMenuTrigger>
    <UiDropdownMenuContent align="end">
      <UiDropdownMenuItem @click="emit('edit', post.id)">
        <Pencil class="mr-0.5 h-4 w-4" />
        <span>Редактировать</span>
      </UiDropdownMenuItem>
      <UiDropdownMenuItem @click="emit('reschedule', post.id)">
        <Calendar class="mr-0.5 h-4 w-4" />
        <span>Перепланировать</span>
      </UiDropdownMenuItem>
      <UiDropdownMenuSeparator />
      <UiDropdownMenuItem
        @click="emit('delete', post.id)"
        class="text-destructive"
      >
        <Trash class="mr-0.5 h-4 w-4 text-destructive" />
        <span>Удалить</span>
      </UiDropdownMenuItem>
    </UiDropdownMenuContent>
  </UiDropdownMenu>
</template>
