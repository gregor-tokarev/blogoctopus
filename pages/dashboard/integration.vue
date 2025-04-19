<script setup lang="ts">
import { Send, Sparkles } from "lucide-vue-next";
import { authClient } from "~/lib/auth-client";
import { onMounted, ref } from "vue";

const session = authClient.useSession();
const isConnected = ref(false);
const isConnecting = ref(false);
const error = ref("");

// Check if user has Telegram integration
async function checkTelegramConnection() {
  try {
    const response = await fetch('/api/telegram/status');
    const data = await response.json();
    isConnected.value = data.isConnected;
  } catch (err) {
    console.error('Failed to check Telegram connection:', err);
    error.value = "Не удалось проверить статус интеграции";
  }
}

// Connect to Telegram
async function connectTelegram() {
  if (isConnecting.value) return;
  
  error.value = "";
  isConnecting.value = true;
  
  try {
    // Get auth URL from our API
    const response = await fetch('/api/telegram/auth-url');
    const { url } = await response.json();
    
    // Open Telegram auth in a popup
    const width = 600;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      url,
      'Telegram Auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Listen for messages from the popup
    window.addEventListener('message', function onMessage(event) {
      if (event.data === 'telegram-auth-success') {
        window.removeEventListener('message', onMessage);
        checkTelegramConnection();
      }
    });
    
    // Check if popup was closed
    const checkInterval = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkInterval);
        isConnecting.value = false;
        checkTelegramConnection();
      }
    }, 500);
  } catch (err) {
    console.error('Failed to connect Telegram:', err);
    error.value = "Не удалось начать процесс авторизации";
  } finally {
    isConnecting.value = false;
  }
}

// Disconnect Telegram integration
async function disconnectTelegram() {
  error.value = "";
  try {
    await fetch('/api/telegram/disconnect', {
      method: 'POST'
    });
    isConnected.value = false;
  } catch (err) {
    console.error('Failed to disconnect Telegram:', err);
    error.value = "Не удалось отключить интеграцию";
  }
}

onMounted(() => {
  checkTelegramConnection();
});
</script>

<template>
  <div class="container py-6">
    <h1 class="text-2xl font-bold mb-6">Интеграции</h1>
    
    <!-- Telegram Integration Card -->
    <div class="bg-card rounded-lg p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <Send class="mr-3 size-5 text-blue-500" />
          <h2 class="text-xl font-semibold">Telegram</h2>
        </div>
        <UiBadge v-if="isConnected" variant="success">Подключено</UiBadge>
        <UiBadge v-else variant="secondary">Не подключено</UiBadge>
      </div>
      
      <p class="text-muted-foreground mb-6">
        Подключите свой аккаунт Telegram для автоматической публикации в вашем канале.
      </p>
      
      <div v-if="error" class="text-red-500 mb-4">{{ error }}</div>
      
      <div v-if="isConnected">
        <UiButton variant="destructive" @click="disconnectTelegram">
          Отключить Telegram
        </UiButton>
      </div>
      <div v-else>
        <UiButton @click="connectTelegram" :disabled="isConnecting">
          <Sparkles v-if="!isConnecting" class="mr-2 size-4" />
          <UiSpinner v-else class="mr-2 size-4" aria-hidden="true" />
          {{ isConnecting ? 'Подключение...' : 'Подключить Telegram' }}
        </UiButton>
      </div>
    </div>
  </div>
</template>
