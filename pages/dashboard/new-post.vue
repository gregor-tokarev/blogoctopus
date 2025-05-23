<template>
  <div
    class="min-h-screen bg-background text-foreground p-4 flex flex-col items-center"
  >
    <header class="w-full max-w-2xl mb-8">
      <h1 class="text-3xl font-bold text-center text-primary">
        Create New Post
      </h1>
    </header>

    <main class="w-full max-w-2xl p-6 bg-card rounded-lg shadow-md">
      <form @submit.prevent="handleSubmit">
        <div class="space-y-6">
          <div>
            <label
              for="title"
              class="block text-sm font-medium text-muted-foreground"
              >Title</label
            >
            <Input
              id="title"
              v-model="form.title"
              type="text"
              placeholder="Enter post title"
              class="mt-1 w-full"
              required
            />
          </div>

          <div>
            <label
              for="content"
              class="block text-sm font-medium text-muted-foreground"
              >Content</label
            >
            <Textarea
              id="content"
              v-model="form.content"
              placeholder="Write your post content here..."
              class="mt-1 w-full"
              rows="10"
              required
            />
          </div>
        </div>

        <div class="mt-8 flex justify-end">
          <Button type="submit" :disabled="isLoading">
            <span v-if="isLoading" class="animate-spin mr-2">
              <svg
                class="w-5 h-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </span>
            {{ isLoading ? "Submitting..." : "Create Post" }}
          </Button>
        </div>
      </form>

      <div
        v-if="submissionStatus"
        :class="[
          'mt-6 p-4 rounded-md text-sm',
          submissionStatus.type === 'success'
            ? 'bg-green-100 text-green-700'
            : 'bg-red-100 text-red-700',
        ]"
      >
        <p>{{ submissionStatus.message }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const form = ref({
  title: "",
  content: "",
});

const isLoading = ref(false);
const submissionStatus = ref<{
  type: "success" | "error";
  message: string;
} | null>(null);

async function handleSubmit() {
  isLoading.value = true;
  submissionStatus.value = null;
  try {
    const response = await $fetch("/api/send-all", {
      method: "POST",
      body: {
        title: form.value.title,
        text: form.value.content,
      },
    });

    // Assuming the API returns a success message or specific data indicating success
    // You might need to adjust this based on the actual API response
    if (response) {
      // Simplified check, adjust as needed
      submissionStatus.value = {
        type: "success",
        message: "Post created and sent successfully!",
      };
      form.value.title = "";
      form.value.content = "";
    } else {
      // This else block might not be reached if $fetch throws an error on non-2xx responses.
      // Error handling is primarily done in the catch block.
      submissionStatus.value = {
        type: "error",
        message: "Failed to create post. API returned an unexpected response.",
      };
    }
  } catch (error: any) {
    console.error("Error submitting post:", error);
    let errorMessage = "Failed to create post. Please try again.";
    if (error.data && error.data.message) {
      errorMessage = error.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    submissionStatus.value = { type: "error", message: errorMessage };
  }
  isLoading.value = false;
}

useHead({
  title: "Create New Post",
});
</script>

<style scoped>
/* Scoped styles if needed, Tailwind is preferred */
</style>
