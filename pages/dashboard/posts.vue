<script setup lang="ts">
import { reactive, computed, watchEffect } from "vue";

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});

const { data, status } = await useFetch("/api/posts", {
  query: {
    page: pagination.page,
    limit: pagination.limit,
  },
  watch: [() => pagination.page, () => pagination.limit],
});

const posts = computed(() => {
  const rawPosts = data.value?.posts ?? [];
  return rawPosts.map((post) => ({
    ...post,
    createdAt: post.createdAt ? new Date(post.createdAt) : null,
    updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
    scheduledAt: post.scheduledAt ? new Date(post.scheduledAt) : null,
  }));
});
const isLoading = computed(() => status.value === "pending");

watchEffect(() => {
  if (data.value?.pagination) {
    pagination.total = data.value.pagination.total;
    pagination.totalPages = data.value.pagination.totalPages;
  }
});

function handlePageChange(page: number) {
  if (page < 1 || page > pagination.totalPages) return;
  pagination.page = page;
}
</script>

<template>
  <div class="py-6 space-y-6 min-w-[1180px]">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold tracking-tight">Посты</h1>
      <NuxtLink to="/dashboard/posts/new">
        <UiButton>
          <Icon name="lucide:plus" class="size-i4" />
          Новый пост
        </UiButton>
      </NuxtLink>
    </div>

    <DashboardPostsTable
      :data="posts"
      :is-loading="isLoading"
      :page-count="pagination.totalPages"
      :current-page="pagination.page"
      @page-change="handlePageChange"
    />
  </div>
</template>
