<script setup lang="ts">
import { reactive, computed, watchEffect } from 'vue';

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
});

const { data, error, pending, refresh } = useFetch('/api/posts', {
  query: () => ({
    page: pagination.page,
    limit: pagination.limit,
  }),
  watch: [() => pagination.page, () => pagination.limit],
});

const posts = computed(() => data.value?.posts ?? []);
const isLoading = computed(() => pending.value);

watchEffect(() => {
  if (data.value?.pagination) {
    pagination.total = data.value.pagination.total;
    pagination.totalPages = data.value.pagination.totalPages;
  }
});

function goToPage(page: number) {
  if (page < 1 || page > pagination.totalPages) return;
  pagination.page = page;
}
</script>

<template>
  <div>
  </div>
</template>
