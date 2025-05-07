<script setup lang="ts">
import { Linkedin, LoaderCircle, Sparkles, Unplug } from "lucide-vue-next";
import { toast } from 'vue-sonner';

const isProcessing = ref(false); // Used for both connecting and disconnecting
const router = useRouter();
const route = useRoute();

// Fetch LinkedIn connection status
const { data: status, refresh: refreshStatus } = useFetch("/api/linkedin/status", {
  transform: (response: any) => response, // Assuming response matches linkedinStatusResponseSchema
});

async function connectLinkedIn() {
  if (status.value?.connected) return;
  isProcessing.value = true;
  try {
    const response: any = await $fetch("/api/linkedin/connect", { method: "post" });
    if (response.success && response.authUrl) {
      // Redirect to LinkedIn's authorization page
      window.location.href = response.authUrl;
    } else {
      toast.error(response.message || "Failed to initiate LinkedIn connection.");
    }
  } catch (error: any) {
    console.error('Error connecting to LinkedIn:', error);
    toast.error(error.data?.message || "An error occurred while trying to connect LinkedIn.");
  } finally {
    // isProcessing will remain true as the page redirects.
    // If there's an error before redirect, it will be set to false.
    if (!window.location.href.includes('linkedin.com')) {
        isProcessing.value = false;
    }
  }
}

async function disconnectLinkedIn() {
  if (!status.value?.connected) return;
  isProcessing.value = true;
  try {
    const result: any = await $fetch("/api/linkedin/disconnect", { method: "post" });
    toast.success(result.message || "LinkedIn disconnected successfully.");
    await refreshStatus();
  } catch (error: any) {
    console.error('Error disconnecting LinkedIn:', error);
    toast.error(error.data?.message || "Failed to disconnect LinkedIn.");
  } finally {
    isProcessing.value = false;
  }
}

// Check for callback query parameters on component mount
onMounted(() => {
  if (route.query.linkedin_connected === 'true') {
    toast.success("LinkedIn connected successfully!");
    // Clean the URL query parameters
    router.replace({ query: { ...route.query, linkedin_connected: undefined, linkedin_error: undefined } });
    refreshStatus();
  } else if (route.query.linkedin_error) {
    const errorMessage = Array.isArray(route.query.linkedin_error) ? route.query.linkedin_error[0] : route.query.linkedin_error;
    toast.error(`LinkedIn connection failed: ${errorMessage || 'Unknown error'}`);
    router.replace({ query: { ...route.query, linkedin_connected: undefined, linkedin_error: undefined } });
  }
});

</script>

<template>
  <div class="bg-card rounded-lg p-6 shadow-sm border">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center">
        <Linkedin class="mr-3 size-6 text-[#0077B5]" />
        <h2 class="text-xl font-semibold">LinkedIn</h2>
      </div>
      <UiBadge v-if="status?.connected" variant="default" class="bg-green-500 hover:bg-green-600 text-white">Подключено</UiBadge>
      <UiBadge v-else variant="secondary">Не подключено</UiBadge>
    </div>

    <p class="text-muted-foreground mb-6">
      Подключите свой аккаунт LinkedIn для автоматической публикации профессиональных обновлений и статей.
    </p>

    <div v-if="status?.connected">
      <UiButton variant="destructive" @click="disconnectLinkedIn" :disabled="isProcessing">
        <LoaderCircle v-if="isProcessing" class="mr-2 size-4 animate-spin" />
        <Unplug v-else class="mr-2 size-4" />
        Отключить LinkedIn
      </UiButton>
    </div>
    <div v-else>
      <UiButton @click="connectLinkedIn" :disabled="isProcessing" class="bg-[#0077B5] hover:bg-[#005E90] text-white">
        <LoaderCircle v-if="isProcessing" class="mr-2 size-4 animate-spin" />
        <Sparkles v-else class="mr-2 size-4" />
        Подключить LinkedIn
      </UiButton>
    </div>
  </div>
</template>
