<script setup lang="ts">
import { authClient } from "~/lib/auth-client";
import { useVuelidate } from '@vuelidate/core';
import { required, helpers } from '@vuelidate/validators';
import { LoaderCircle, Info, Sparkles, Send } from "lucide-vue-next";
import { toast } from "vue-sonner";

const session = authClient.useSession();
const isConnected = ref(false);
const isConnecting = ref(false);
const error = ref("");
const channelName = ref("");
const showDialog = ref(false);

// Initialize Vuelidate
const v$ = useVuelidate({
  channelName: {
    required: helpers.withMessage('Имя канала обязательно', required),
    validFormat: helpers.withMessage('Формат канала должен быть @channel_name', helpers.regex(/^@[a-zA-Z][a-zA-Z0-9_]{3,30}$/))
  }
}, { channelName });

// Check if user has Telegram integration
// async function checkTelegramConnection() {
//   try {
//     const response = await fetch('/api/telegram/status');
//     const data = await response.json();
//     isConnected.value = data.isConnected;
//   } catch (err) {
//     console.error('Failed to check Telegram connection:', err);
//     error.value = "Не удалось проверить статус интеграции";
//   }
// }

// Connect to Telegram
async function connectTelegram() {
  showDialog.value = true;
  // Reset form state
  channelName.value = "";
  v$.value.$reset();
  error.value = "";
}

// Save Telegram channel connection
async function saveTelegramChannel() {
  error.value = "";
  
  // Validate form
  const isFormValid = await v$.value.$validate();
  if (!isFormValid) {
    return;
  }
  
  isConnecting.value = true;
  
  try {
    await $fetch("/api/telegram/connect", {
      method: "post", 
      body: { channelName: channelName.value }
    });

    showDialog.value = false;
  } catch (err: any) {
    console.error('Failed to connect Telegram:', err);

    toast.error(err.data.message, {})
  } finally {
    isConnecting.value = false;
  }
}

// Disconnect Telegram integration
// async function disconnectTelegram() {
//   error.value = "";
//   try {
//     await fetch('/api/telegram/disconnect', {
//       method: 'POST'
//     });
//     isConnected.value = false;
//   } catch (err) {
//     console.error('Failed to disconnect Telegram:', err);
//     error.value = "Не удалось отключить интеграцию";
//   }
// }
</script>

<template>
  <div class="container py-6">
    <h1 class="text-2xl font-bold mb-6">Интеграции</h1>
    
    <UiAlertDialog :open="showDialog">
    <!-- Telegram Integration Card -->
    <UiAlertDialogTrigger class="bg-card rounded-lg p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <Send class="mr-3 size-5 text-blue-500" />
          <h2 class="text-xl font-semibold">Telegram</h2>
        </div>
        <UiBadge v-if="isConnected" variant="default">Подключено</UiBadge>
        <UiBadge v-else variant="secondary">Не подключено</UiBadge>
      </div>
      
      <p class="text-muted-foreground mb-6">
        Подключите свой аккаунт Telegram для автоматической публикации в вашем канале.
      </p>
      
      <div v-if="isConnected">
        <!-- <UiButton variant="destructive" @click="disconnectTelegram">
          Отключить Telegram
        </UiButton> -->
      </div>
      <div v-else>
        <UiButton @click="connectTelegram" :disabled="isConnecting">
          <Sparkles v-if="!isConnecting" class="mr-0.5 size-4" />
          <LoaderCircle v-else class="mr-0.5 size-4 animate-spin" aria-hidden="true" />
          {{ isConnecting ? 'Подключение...' : 'Подключить Telegram' }}
        </UiButton>
      </div>
    </UiAlertDialogTrigger>
    
    <!-- Telegram Connection Dialog -->
        <UiAlertDialogContent>
          <UiAlertDialogHeader>
            <UiAlertDialogTitle>Подключение Telegram</UiAlertDialogTitle>
            <UiAlertDialogDescription>
              <div class="space-y-4 my-4">
                <div class="flex items-start gap-2">
                  <div class="bg-blue-100 rounded-full p-1 mt-1">
                    <Info class="size-4 text-blue-600" />
                  </div>
                  <div>
                    <p class="font-medium">Шаг 1:</p>
                    <p>Добавьте бота <span class="font-mono bg-muted px-1.5 py-0.5 rounded">@blogoctopus_integration_bot</span> в канал, где вы хотите публиковать сообщения, и сделайте его администратором.</p>
                  </div>
                </div>
                
                <div class="flex items-start gap-2">
                  <div class="bg-blue-100 rounded-full p-1 mt-1">
                    <Info class="size-4 text-blue-600" />
                  </div>
                  <div>
                    <p class="font-medium">Шаг 2:</p>
                    <p>Введите название вашего канала в поле ниже и нажмите "Сохранить".</p>
                  </div>
                </div>
                
                <form @submit.prevent="saveTelegramChannel" class="mt-6">
                  <div class="mb-4">
                    <label for="channel-name" class="block text-sm font-medium mb-1">Название канала</label>
                    <UiInput 
                      id="channel-name"
                      v-model="channelName"
                      placeholder="Например: @my_channel"
                      :error="v$.channelName.$error"
                      @blur="channelName.length > 0 && v$.channelName.$touch()"
                    />
                    
                    <!-- Validation messages -->
                    <div v-if="v$.channelName.$error" class="text-sm h-4 text-destructive mt-1">
                      <span v-if="v$.channelName.required.$invalid">Имя канала обязательно</span>
                      <span v-else-if="v$.channelName.validFormat.$invalid">Формат канала должен быть @channel_name</span>
                    </div>
                    
                    <p v-else class="text-xs text-muted-foreground mt-1 h-4">Укажите имя канала, включая символ @</p>
                  </div>
                </form>
              </div>
            </UiAlertDialogDescription>
          </UiAlertDialogHeader>
          <UiAlertDialogFooter>
            <UiAlertDialogCancel @click="showDialog = false">Отмена</UiAlertDialogCancel>
            <UiAlertDialogAction 
              @click="saveTelegramChannel" 
              :disabled="isConnecting || v$.$error"
              :class="{'opacity-50 cursor-not-allowed': v$.$invalid}"
            >
              <LoaderCircle v-if="isConnecting" class="mr-0.5 size-4 animate-spin" aria-hidden="true" />
              {{ isConnecting ? 'Сохранение...' : 'Сохранить' }}
            </UiAlertDialogAction>
          </UiAlertDialogFooter>
        </UiAlertDialogContent>
      </UiAlertDialog>
  </div>
</template>
