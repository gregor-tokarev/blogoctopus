<script setup lang="ts">
import useVuelidate from '@vuelidate/core';
import { helpers, required } from '@vuelidate/validators';
import { LoaderCircle, Info, Sparkles, Send } from "lucide-vue-next";
import { toast } from 'vue-sonner';

const isConnecting = ref(false);
const error = ref("");
const channelName = ref("");
const showDialog = ref(false);

const {data: status, refresh} = useFetch("/api/telegram/status")

const v$ = useVuelidate({
  channelName: {
    required: helpers.withMessage('Имя канала обязательно', required),
    validFormat: helpers.withMessage('Формат канала должен быть @channel_name', helpers.regex(/^@[a-zA-Z][a-zA-Z0-9_]{3,30}$/))
  }
}, { channelName });

async function disconnectTelegram() {
    if (!status.value?.isConnected) return 

    try {
        const result: any = await $fetch("/api/telegram/disconnect", {method: "post"})
        toast(result.message)
    } catch (error: any) {
       toast.error(error.data.message) 
    } finally {
        await refresh()
    }
}

async function connectTelegram() {
  error.value = "";
  
  // Validate form
  const isFormValid = await v$.value.$validate();
  if (!isFormValid) {
    return;
  }
  
  isConnecting.value = true;
  
  try {
    const result: any = await $fetch("/api/telegram/connect", {
      method: "post", 
      body: { channelName: channelName.value }
    });

    showDialog.value = false;

    await nextTick()
    toast(result.message)

  } catch (err: any) {
    console.error('Failed to connect Telegram:', err);

    toast.error(err.data.message, {})
  } finally {
    isConnecting.value = false;

    await refresh()
  }
}
</script>

<template>
        <UiAlertDialog :open="showDialog">
    <!-- Telegram Integration Card -->
    <UiAlertDialogTrigger class="bg-card rounded-lg p-6 shadow-sm">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center">
          <Send class="mr-3 size-5 text-blue-500" />
          <h2 class="text-xl font-semibold">Telegram</h2>
        </div>
        <UiBadge v-if="status?.isConnected" variant="default">Подключено</UiBadge>
        <UiBadge v-else variant="secondary">Не подключено</UiBadge>
      </div>
      
      <p class="text-muted-foreground mb-6">
        Подключите свой аккаунт Telegram для автоматической публикации в вашем канале.
      </p>
      
      <div v-if="status?.isConnected">
        <UiButton variant="destructive" @click="disconnectTelegram">
          Отключить Telegram
        </UiButton>
      </div>
      <div v-else>
        <UiButton @click="showDialog = true">
          <Sparkles class="mr-0.5 size-4" />
          Подключить Telegram
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
                
                <form @submit.prevent="connectTelegram" class="mt-6">
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
              @click="connectTelegram" 
              :disabled="isConnecting || v$.$error"
              :class="{'opacity-50 cursor-not-allowed': v$.$invalid}"
            >
              <LoaderCircle v-if="isConnecting" class="mr-0.5 size-4 animate-spin" aria-hidden="true" />
              {{ isConnecting ? 'Сохранение...' : 'Сохранить' }}
            </UiAlertDialogAction>
          </UiAlertDialogFooter>
        </UiAlertDialogContent>
      </UiAlertDialog>
</template>