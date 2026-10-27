<script lang="ts">
  import type { ArtifactItem } from '../types/artifact';
  import { resolveUrl, renderFormattedBody } from '../utils/markdown';

  let {
    artifact,
    onclose
  }: {
    artifact: ArtifactItem | null;
    onclose: () => void;
  } = $props();

  let dialogRef = $state<HTMLDialogElement | null>(null);
  let modalScrollContainer = $state<HTMLDivElement | null>(null);
  let modalHeroImage = $state<string | null>(null);

  function resetModalScroll() {
    if (dialogRef) {
      dialogRef.scrollTop = 0;
    }
    if (modalScrollContainer) {
      modalScrollContainer.scrollTop = 0;
    }
    requestAnimationFrame(() => {
      if (dialogRef) dialogRef.scrollTop = 0;
      if (modalScrollContainer) modalScrollContainer.scrollTop = 0;
    });
  }

  $effect(() => {
    if (artifact) {
      modalHeroImage = artifact.previewImage || null;
      if (dialogRef && !dialogRef.open) {
        dialogRef.showModal();
        document.body.style.overflow = 'hidden';
      }
      resetModalScroll();
    } else {
      if (dialogRef && dialogRef.open) {
        dialogRef.close();
      }
      document.body.style.overflow = '';
    }
  });

  function closeModal() {
    if (dialogRef && dialogRef.open) {
      dialogRef.close();
    }
    document.body.style.overflow = '';
    onclose();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (dialogRef && event.target === dialogRef) {
      closeModal();
    }
  }

  function handleDialogClose() {
    document.body.style.overflow = '';
    onclose();
  }

  function getEmbedUrl(url: string = ''): { type: 'youtube' | 'vimeo' | 'video' | 'none'; src: string } {
    if (!url) return { type: 'none', src: '' };
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return { type: 'youtube', src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0` };
    }
    // Vimeo
    const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeoMatch[1]}` };
    }
    // Direct video (.mp4, .webm, or local path)
    return { type: 'video', src: resolveUrl(url) };
  }
</script>

<!-- Lightbox Modal (<dialog>) with Full-Width Editorial Layout -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialogRef}
  onclick={handleBackdropClick}
  onclose={handleDialogClose}
  class="backdrop:bg-black/60 backdrop:backdrop-blur-md bg-transparent p-3 sm:p-6 max-w-4xl lg:max-w-5xl w-full max-h-[96vh] focus:outline-none m-auto"
>
  {#if artifact}
    <div
      class="bg-white border border-[#dddedc] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#525252]"
    >
      <!-- Modal Top Bar -->
      <div class="p-5 px-6 sm:px-8 border-b border-[#dddedc] bg-white sticky top-0 z-30 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
          {#if artifact.featured}
            <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#102f10] text-white shadow-sm shrink-0">
              Featured
            </span>
          {/if}
          {#each artifact.tags as tag}
            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#efeef1] text-[#67645e] border border-[#dddedc]">
              {tag}
            </span>
          {/each}
          {#if artifact.mediaType === 'video'}
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-[#643a2a] text-white flex items-center gap-1.5 shadow-sm">
              <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Video Showcase
            </span>
          {/if}
          {#if artifact.metrics}
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-[#67645e] text-white shadow-sm">
              {artifact.metrics}
            </span>
          {/if}
        </div>

        <button
          type="button"
          onclick={closeModal}
          class="p-2 rounded-full text-[#84827e] hover:text-[#67645e] hover:bg-[#efeef1] transition cursor-pointer shrink-0"
          aria-label="Close case study dialog"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Full-Width Scrollable Body (The Case Study Narrative is the Centerpiece) -->
      <div bind:this={modalScrollContainer} class="p-6 sm:p-10 md:p-12 overflow-y-auto space-y-8 max-h-[calc(92vh-130px)] scrollbar-rhode">
        <!-- Case Study Title & Overview -->
        <div class="space-y-4">
          <span class="text-[10px] font-bold uppercase tracking-widest text-[#84827e] block">
            Case Study Narrative
          </span>
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#67645e] tracking-tight leading-tight">
            {artifact.title}
          </h1>
          {#if artifact.description}
            <p class="text-base sm:text-lg text-[#525252] leading-relaxed font-normal max-w-3xl">
              {artifact.description}
            </p>
          {/if}
        </div>

        <!-- Commercial Impact Metric Banner (Rhode High-Impact Results Styling) -->
        {#if artifact.metrics}
          <div class="rounded-2xl bg-[#efeef1] border border-[#dddedc] p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div class="space-y-1">
              <span class="text-[10px] font-bold uppercase tracking-widest text-[#84827e] block">
                Commercial Impact & Results
              </span>
              <div class="text-3xl sm:text-4xl font-bold tracking-tight text-[#67645e]">
                {artifact.metrics}
              </div>
            </div>
            <div class="text-xs font-medium text-[#84827e] bg-white px-4 py-2 rounded-full border border-[#dddedc] shadow-xs">
              Key Performance Indicator Target
            </div>
          </div>
        {/if}

        <!-- Primary Media Display (Interactive Video Player or High-Res Artwork) -->
        {#if artifact.mediaType === 'video' && artifact.videoUrl && modalHeroImage === artifact.previewImage}
          {@const embed = getEmbedUrl(artifact.videoUrl)}
          <div class="rounded-2xl overflow-hidden border border-[#dddedc] shadow-md bg-black aspect-video w-full">
            {#if embed.type === 'youtube' || embed.type === 'vimeo'}
              <iframe
                src={embed.src}
                title={artifact.title}
                class="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              ></iframe>
            {:else if embed.type === 'video'}
              <video
                src={embed.src}
                controls
                playsinline
                preload="metadata"
                poster={resolveUrl(artifact.previewImage)}
                class="w-full h-full object-contain bg-black"
              >
                <track kind="captions" />
                Your browser does not support the video tag.
              </video>
            {:else if artifact.previewImage}
              <img
                src={resolveUrl(artifact.previewImage)}
                alt={artifact.title}
                class="w-full h-full object-cover object-center"
              />
            {/if}
          </div>
        {:else if modalHeroImage}
          <div class="relative rounded-2xl overflow-hidden border border-[#dddedc] shadow-sm bg-[#efeef1] w-full group/preview">
            <img
              src={resolveUrl(modalHeroImage)}
              alt={artifact.title}
              class="w-full max-h-[580px] object-contain mx-auto bg-[#efeef1]"
            />
            {#if artifact.mediaType === 'video' && artifact.videoUrl && modalHeroImage !== artifact.previewImage}
              <button
                type="button"
                onclick={() => {
                  modalHeroImage = artifact?.previewImage || null;
                }}
                class="absolute top-4 right-4 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-[#67645e] text-white hover:bg-[#525252] transition-colors shadow-md backdrop-blur-sm cursor-pointer flex items-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Return to Video
              </button>
            {:else if artifact.previewImage && modalHeroImage !== artifact.previewImage}
              <button
                type="button"
                onclick={() => {
                  modalHeroImage = artifact?.previewImage || null;
                }}
                class="absolute top-4 right-4 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-[#67645e] text-white hover:bg-[#525252] transition-colors shadow-md backdrop-blur-sm cursor-pointer"
              >
                Reset to Cover
              </button>
            {/if}
          </div>
        {/if}

        <!-- Case Study Full-Width Narrative Body (THE BULK OF THE DISPLAY) -->
        {#if artifact.body}
          <div class="prose prose-stone max-w-none text-[#525252] text-sm sm:text-base leading-relaxed pt-2">
            {@html renderFormattedBody(artifact.body)}
          </div>
        {/if}

        <!-- Supporting Collateral Grid (If any) -->
        {#if artifact.galleryImages && artifact.galleryImages.length > 0}
          <div class="space-y-4 pt-8 border-t border-[#dddedc]">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-[#67645e]">
                Supporting Collateral & Assets ({artifact.galleryImages.length})
              </span>
              <span class="text-[11px] font-medium text-[#84827e]">Click any asset to view in hero frame</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {#each artifact.galleryImages as imgUrl, idx}
                <button
                  type="button"
                  class="group/asset relative rounded-xl overflow-hidden border border-[#dddedc] bg-[#efeef1] shadow-sm hover:shadow-md hover:border-[#67645e] transition-all text-left cursor-pointer p-0 block aspect-video focus:outline-none focus:ring-2 focus:ring-[#84827e]"
                  onclick={() => {
                    modalHeroImage = imgUrl;
                  }}
                  aria-label={`View collateral visual ${idx + 1}`}
                >
                  <img
                    src={resolveUrl(imgUrl)}
                    alt={`${artifact.title} collateral ${idx + 1}`}
                    class="w-full h-full object-cover object-center group-hover/asset:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Live Project Action Button -->
        {#if artifact.showLiveLink && artifact.link}
          <div class="pt-6 border-t border-[#dddedc] flex justify-center sm:justify-start">
            <a
              href={artifact.link}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider bg-[#67645e] text-white hover:bg-[#525252] shadow-sm transition-all"
            >
              <span>View Live Project</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        {/if}
      </div>

      <!-- Lightbox Footer -->
      <div class="p-4 px-6 sm:px-8 border-t border-[#dddedc] bg-white flex items-center justify-between gap-4">
        <div class="text-xs font-medium text-[#84827e]">
          {#if artifact.showDate && artifact.date}
            Archived on {new Date(artifact.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
          {/if}
        </div>

        <button
          type="button"
          onclick={closeModal}
          class="px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-[#efeef1] text-[#67645e] hover:bg-[#dddedc] transition cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  {/if}
</dialog>
