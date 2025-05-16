<script setup lang="ts">
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  isConnected: {
    type: Boolean,
    default: false
  },
  icon: {
    type: Object,
    required: true
  },
  iconColor: {
    type: String,
    default: 'text-primary'
  },
  connectLabel: {
    type: String,
    default: 'Подключить'
  },
  disconnectLabel: {
    type: String,
    default: 'Отключить'
  },
  connectIcon: {
    type: Object,
    default: null
  },
  disconnectIcon: {
    type: Object,
    default: null
  },
  connectBtnClass: {
    type: String,
    default: 'self-start mr-auto'
  },
  disconnectBtnClass: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['connect', 'disconnect']);

function onConnect() {
  emit('connect');
}

function onDisconnect() {
  emit('disconnect');
}
</script>

<template>
  <div class="bg-card rounded-lg p-6 border">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center">
        <component :is="icon" class="mr-3 size-5" :class="iconColor" />
        <h2 class="text-xl font-semibold">{{ title }}</h2>
      </div>
      <UiBadge v-if="isConnected" variant="default">Подключено</UiBadge>
      <UiBadge v-else variant="secondary">Не подключено</UiBadge>
    </div>
    
    <p class="text-muted-foreground mb-6 text-left">
      {{ description }}
    </p>
    
    <!-- Default button actions -->
    <slot>
      <UiButton
        variant="destructive"
        v-if="isConnected"
        @click="onDisconnect"
        :class="disconnectBtnClass"
      >
        <component :is="disconnectIcon" v-if="disconnectIcon" class="mr-0.5 size-4" />
        {{ disconnectLabel }} {{ title }}
      </UiButton>
      <UiButton
        v-else
        @click="onConnect"
        :class="connectBtnClass"
      >
        <component :is="connectIcon" v-if="connectIcon" class="mr-2 size-4" />
        {{ connectLabel }} {{ title }}
      </UiButton>
    </slot>
  </div>
</template>
