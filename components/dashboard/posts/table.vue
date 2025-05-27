<script setup lang="ts">
import type { InferSelectModel } from "drizzle-orm";
import { ref, computed } from "vue";
import { posts } from "~/server/schema";
import { FlexRender, createColumnHelper, getCoreRowModel, getPaginationRowModel, useVueTable, type ColumnDef } from "@tanstack/vue-table";

type Post = InferSelectModel<typeof posts>;

const props = defineProps<{
  data: Post[];
  isLoading: boolean;
  pageCount: number;
  currentPage: number;
}>();

const emit = defineEmits<{
  (e: "page-change", page: number): void;
}>();

const searchQuery = useState<string>("searchQuery", () => "");
const sortColumn = useState<string | null>("sortColumn", () => null);
const sortDirection = useState<"asc" | "desc">("sortDirection", () => "desc");


// Use columnHelper to create properly typed columns
const columnHelper = createColumnHelper<Post>();

// Columns configuration using ColumnDef type
const columns: ColumnDef<Post, any>[] = [
  columnHelper.accessor('content', {
    header: 'Контент',
    cell: info => {
      const content = info.getValue();

      return content.length > 20 ? `${content.substring(0, 20)}...` : content;
    },
  }),
  columnHelper.accessor('scheduledAt', {
    header: 'Запланировано',
    cell: info => {
      const scheduledAt = info.getValue();

      return scheduledAt ? new Date(scheduledAt.toString()).toLocaleString() : "Не запланировано";
    },
  }),
  columnHelper.accessor('createdAt', {
    header: 'Создано',
    cell: info => {
      const createdAt = info.getValue();

      return createdAt ? new Date(createdAt.toString()).toLocaleString() : "";
    },
  }),
  columnHelper.display({
    id: 'integrations',
    header: 'Интеграции',
    cell: info => {
      const row = info.row.original;

      const integrations = [];
      if (row.linkedinIntegrationId) integrations.push("LinkedIn");
      if (row.telegramIntegrationId) integrations.push("Telegram");

      return integrations.length ? integrations.join(", ") : "Нет";
    },
  }),
];

const table = useVueTable({
  data: computed(() => props.data),
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
})
</script>

<template>
  <div class="w-full space-y-4">
    <div class="flex items-center justify-between">
      <UiInput placeholder="Фильтр постов..." class="max-w-sm" v-model="searchQuery" />
    </div>

    <div class="rounded-md border">
      <UiTable>
        <UiTableHeader>
          <UiTableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <UiTableHead v-for="header in headerGroup.headers" :key="header.id">
              <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header"
                :props="header.getContext()" />
            </UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <template v-if="table.getRowModel().rows?.length">
            <UiTableRow v-for="row in table.getRowModel().rows" :key="row.id"
              :data-state="row.getIsSelected() ? 'selected' : undefined">
              <UiTableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </UiTableCell>
            </UiTableRow>
          </template>
          <template v-else>
            <UiTableRow>
              <UiTableCell :colspan="columns.length" class="h-24 text-center">
                Ничего не найдено
              </UiTableCell>
            </UiTableRow>
          </template>
        </UiTableBody>
      </UiTable>
    </div>

    <div class="flex items-center justify-between space-x-2 py-4">
      <div class="text-sm text-muted-foreground">
      </div>
      <div class="flex items-center space-x-2">
        <UiButton variant="outline" size="sm" :disabled="table.getCanPreviousPage()"
          @click="table.previousPage()">
          Предыдущая
        </UiButton>
        <UiButton variant="outline" size="sm" :disabled="table.getCanNextPage()"
          @click="table.nextPage()">
          Следующая
        </UiButton>
      </div>
    </div>
  </div>
</template>
