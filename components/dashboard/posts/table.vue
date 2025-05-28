<script setup lang="ts">
import type { InferSelectModel } from "drizzle-orm";
import { computed, h, watch } from "vue";
import { posts } from "~/server/schema";
import { FlexRender, createColumnHelper, getCoreRowModel, getPaginationRowModel, useVueTable, type ColumnDef } from "@tanstack/vue-table";
import { Checkbox } from "~/components/ui/checkbox";
import { formatHumanReadableDate } from "~/utils/date";
import PostActions from "./post-actions.vue";

type Post = InferSelectModel<typeof posts>;

const props = defineProps<{
  data: Post[];
  isLoading: boolean;
  pageCount: number;
  currentPage: number;
}>();

const selectedRows = useState<Record<string, boolean>>("selectedPostRows", () => ({}));

const isAllSelected = computed(() => {
  const rowIds = props.data.map(row => row.id);
  return rowIds.length > 0 && rowIds.every(id => selectedRows.value[id]);
});

const toggleAll = (checked: boolean) => {
  if (!checked) {
    selectedRows.value = {};
  } else {
    const newSelected = { ...selectedRows.value };
    props.data.forEach(row => {
      newSelected[row.id] = true;
    });
    selectedRows.value = newSelected;
  }
};

const getSelectedIds = () => {
  return Object.entries(selectedRows.value)
    .filter(([_, isSelected]) => isSelected)
    .map(([id]) => id);
};

watch(selectedRows, () => {
  emit("select-rows", getSelectedIds());
}, { deep: true });

const toggleRow = (id: string, checked: boolean) => {
  selectedRows.value = {
    ...selectedRows.value,
    [id]: checked
  };
};

const emit = defineEmits<{
  (e: "select-rows", selectedIds: string[]): void;
  (e: "page-change", page: number): void;
  (e: "delete", selectedIds: string[]): void;
  (e: "discard"): void;
  (e: "reschedule", selectedIds: string[]): void;
  (e: "edit", postId: string): void;
}>();

const searchQuery = useState<string>("searchQuery", () => "");
const sortColumn = useState<string | null>("sortColumn", () => null);
const sortDirection = useState<"asc" | "desc">("sortDirection", () => "desc");


// Use columnHelper to create properly typed columns
const columnHelper = createColumnHelper<Post>();

// Columns configuration using ColumnDef type
const columns: ColumnDef<Post, any>[] = [
  columnHelper.display({
    id: 'select',
    header: () =>
      h('div', { class: 'flex items-center justify-center' }, [
        h(Checkbox, {
          class: "cursor-pointer",
          modelValue: isAllSelected.value,
          'onUpdate:modelValue': (value: boolean | string) => toggleAll(value as boolean)
        })
      ]),
    enableSorting: false,
    enableHiding: false,
    cell: info => {
      const id = info.row.original.id;
      return h('div', { class: 'flex items-center justify-center' }, [
        h(Checkbox, {
          class: "cursor-pointer",
          modelValue: selectedRows.value[id] ?? false,
          'onUpdate:modelValue': (value: boolean | string) => { toggleRow(id, value as boolean) }
        })
      ]);
    },
  }),
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

      return scheduledAt ? formatHumanReadableDate(scheduledAt) : "Не запланировано";
    },
  }),
  columnHelper.accessor('createdAt', {
    header: 'Создано',
    cell: info => formatHumanReadableDate(info.getValue()),
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
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => h(PostActions, {
      post: row.original,
      onDelete: (id) => emit('delete', [id]),
      onReschedule: (id) => emit('reschedule', [id]),
      onEdit: (id) => emit('edit', id)
    }),
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
    <div class="rounded-md border relative">
      <Transition enter-active-class="transition duration-200 ease-out"
        enter-from-class="transform -translate-y-2 opacity-0" enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in" leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-2 opacity-0">
        <div v-if="getSelectedIds().length > 0"
          class="absolute left-0 right-0 top-0 z-10 flex items-center gap-2 h-10 px-4 bg-accent rounded-t-md border-b border-border">
          <span class="text-xs font-medium">Выбрано: {{ getSelectedIds().length }}</span>
          <div class="flex items-center gap-1 ml-auto">
            <UiButton variant="outline" size="xs" @click="emit('delete', getSelectedIds())">
              Удалить
            </UiButton>
            <UiButton variant="outline" size="xs" @click="emit('reschedule', getSelectedIds())">
              Перепланировать
            </UiButton>
            <UiButton variant="ghost" size="xs" @click="toggleAll(false)">
              Отменить выбор
            </UiButton>
          </div>
        </div>
      </Transition>
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
    
    <div v-if="props.pageCount > 1" class="flex items-center justify-end space-x-2 py-4">
      <UiPagination>
        <UiPaginationContent>
          <UiPaginationItem>
            <UiPaginationPrevious 
              :disabled="table.getCanPreviousPage()" 
              @click="table.previousPage()"
            />
          </UiPaginationItem>
          
          <UiPaginationItem v-for="page in props.pageCount" :key="page">
            <UiButton 
              variant="outline" 
              size="icon" 
              class="h-9 w-9" 
              :class="{ 'bg-accent': props.currentPage === page }"
              @click="emit('page-change', page)"
            >
              {{ page }}
            </UiButton>
          </UiPaginationItem>
          
          <UiPaginationItem>
            <UiPaginationNext 
              :disabled="table.getCanNextPage()" 
              @click="table.nextPage()"
            />
          </UiPaginationItem>
        </UiPaginationContent>
      </UiPagination>
    </div>
  </div>
</template>
