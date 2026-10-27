<script lang="ts">
  import { onMount } from 'svelte';
  import type { ArtifactItem } from '../types/artifact';
  import ArtifactModal from './ArtifactModal.svelte';
  import { resolveUrl } from '../utils/markdown';

  let { artifacts = [] }: { artifacts: ArtifactItem[] } = $props();

  let carouselTrack = $state<HTMLDivElement | null>(null);
  let activeArtifact = $state<ArtifactItem | null>(null);
  let canScrollLeft = $state(false);
  let canScrollRight = $state(true);

  // Scan and filter artifacts marked as featured and not hidden
  let featuredArtifacts = $derived(
    artifacts
      .filter((item) => Boolean(item.featured) && !item.hidden)
      .sort((a, b) => {
        const orderA = a.order !== null && a.order !== undefined ? Number(a.order) : Infinity;
        const orderB = b.order !== null && b.order !== undefined ? Number(b.order) : Infinity;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      })
  );

  function updateScrollButtons() {
    if (!carouselTrack) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselTrack;
    canScrollLeft = scrollLeft > 10;
    canScrollRight = scrollLeft < scrollWidth - clientWidth - 10;
  }

  function scrollPrev() {
    if (!carouselTrack) return;
    const firstCard = carouselTrack.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard ? firstCard.offsetWidth + 24 : carouselTrack.clientWidth * 0.85;
    carouselTrack.scrollBy({ left: -cardWidth, behavior: 'smooth' });
  }

  function scrollNext() {
    if (!carouselTrack) return;
    const firstCard = carouselTrack.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard ? firstCard.offsetWidth + 24 : carouselTrack.clientWidth * 0.85;
    carouselTrack.scrollBy({ left: cardWidth, behavior: 'smooth' });
  }

  function openModal(item: ArtifactItem) {
    activeArtifact = item;
  }

  function closeModal() {
    activeArtifact = null;
  }

  onMount(() => {
    updateScrollButtons();
    const timer = setTimeout(updateScrollButtons, 150);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateScrollButtons);
    };
  });

  $effect(() => {
    if (featuredArtifacts.length > 0 && carouselTrack) {
      setTimeout(updateScrollButtons, 80);
    }
  });
</script>

<div class="space-y-8">
  <!-- Section Title & Controls Bar -->
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
    <div class="max-w-2xl space-y-3">
      <h2 class="text-3xl sm:text-4xl font-bold text-[#102f10] tracking-tight">
        selected work
      </h2>

      <p class="text-stone-900 text-sm sm:text-base leading-relaxed font-medium">
        A curated showcase of featured campaigns, growth strategies, and creative direction.
      </p>
    </div>

    <!-- Actions & Side-Scrolling Controls -->
    <div class="flex items-center gap-3 sm:gap-4 shrink-0">
      <!-- Curatorial Badge Count -->
      <div class="text-xs font-medium text-[#84827e] flex items-center gap-2 bg-[#efeef1] border border-[#dddedc] px-3.5 py-1.5 rounded-full shadow-xs">
        <span class="w-2 h-2 rounded-full bg-[#102f10]"></span>
        <span><strong class="text-[#102f10] font-bold">{featuredArtifacts.length}</strong> featured</span>
      </div>

      <!-- Navigation Chevrons -->
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          onclick={scrollPrev}
          disabled={!canScrollLeft}
          aria-label="Previous featured work"
          class={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#102f10] ${
            canScrollLeft
              ? 'border-[#dddedc] bg-white text-[#102f10] hover:bg-[#102f10] hover:text-white hover:border-[#102f10] shadow-sm'
              : 'border-[#dddedc]/60 bg-white/60 text-[#84827e]/40 cursor-not-allowed'
          }`}
        >
          <svg class="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onclick={scrollNext}
          disabled={!canScrollRight}
          aria-label="Next featured work"
          class={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#102f10] ${
            canScrollRight
              ? 'border-[#dddedc] bg-white text-[#102f10] hover:bg-[#102f10] hover:text-white hover:border-[#102f10] shadow-sm'
              : 'border-[#dddedc]/60 bg-white/60 text-[#84827e]/40 cursor-not-allowed'
          }`}
        >
          <svg class="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Carousel Scroll Track -->
  {#if featuredArtifacts.length === 0}
    <div class="py-16 text-center rounded-2xl border border-dashed border-[#dddedc] bg-[#efeef1]/60 p-8">
      <p class="text-sm text-[#84827e]">No featured artifacts currently selected.</p>
    </div>
  {:else}
    <div
      bind:this={carouselTrack}
      onscroll={updateScrollButtons}
      class="flex gap-5 sm:gap-6 overflow-x-auto scroll-smooth pb-4 pt-1 -mx-6 px-6 scrollbar-none snap-x snap-mandatory"
      style="scrollbar-width: none; -ms-overflow-style: none;"
    >
      {#each featuredArtifacts as artifact (artifact.id)}
        <article
          class="shrink-0 w-[84vw] max-w-[340px] sm:w-[380px] sm:max-w-none md:w-[420px] lg:w-[440px] snap-start group relative flex flex-col bg-[#efeef1] border border-[#dddedc] rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer select-none"
          onclick={() => openModal(artifact)}
          onkeydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openModal(artifact);
            }
          }}
          tabindex="0"
          role="button"
          aria-label={"View case study: " + artifact.title}
        >
          <!-- Artifact Preview Frame -->
          <div class="relative w-full aspect-[16/10] overflow-hidden bg-white border-b border-[#dddedc]">
            {#if artifact.previewImage}
              <img
                src={resolveUrl(artifact.previewImage)}
                alt={artifact.title}
                class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center bg-[#efeef1] text-[#84827e] italic text-xs">
                Visual preview unavailable
              </div>
            {/if}

            <!-- Video Play Button Overlay on Card -->
            {#if artifact.mediaType === 'video'}
              <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div class="w-11 h-11 rounded-full bg-[#67645e]/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm border border-white/20">
                  <svg class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            {/if}

            <!-- Visual Overlay Badges -->
            <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#102f10] text-white backdrop-blur-md shadow-sm shrink-0">
                  Featured
                </span>

                {#if artifact.mediaType === 'video'}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#643a2a] text-white backdrop-blur-md shadow-sm shrink-0 flex items-center gap-1">
                    <svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Video
                  </span>
                {:else if artifact.mediaType === 'document'}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#525252] text-white backdrop-blur-md shadow-sm shrink-0">
                    Doc
                  </span>
                {/if}
              </div>

              {#if artifact.metrics}
                <span class="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-white/95 text-[#67645e] shadow-sm backdrop-blur-md border border-[#dddedc] truncate">
                  {artifact.metrics}
                </span>
              {/if}
            </div>
          </div>

          <!-- Exhibition Placard (Card Content) -->
          <div class="p-5 sm:p-6 flex flex-col justify-between flex-1 space-y-4">
            <div>
              <!-- Tag Badges Strip -->
              <div class="flex flex-wrap gap-1.5 mb-2.5">
                {#each artifact.tags as tag}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white text-[#84827e] border border-[#dddedc]">
                    {tag}
                  </span>
                {/each}
              </div>

              <!-- Campaign Title -->
              <h3 class="leading-snug mb-2 line-clamp-2 text-lg sm:text-xl font-bold text-[#67645e] group-hover:text-[#525252] transition-colors">
                {artifact.title}
              </h3>

              <!-- Narrative Summary -->
              <p class="text-xs sm:text-sm text-[#525252] leading-relaxed line-clamp-3 font-normal">
                {artifact.description}
              </p>
            </div>

            <!-- Placard Action Footer -->
            <div class="pt-3 border-t border-[#dddedc]/80 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                {#if artifact.showDate && artifact.date}
                  <span class="text-[11px] font-medium text-[#84827e] shrink-0">
                    {new Date(artifact.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                  </span>
                {/if}
              </div>

              <div class="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#102f10] text-white group-hover:bg-[#184418] transition-all shadow-sm group-hover:shadow shrink-0 ml-auto">
                <span>{artifact.mediaType === 'video' ? 'Watch' : 'Explore'}</span>
                <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<!-- Modal Lightbox for Full Case Study Exhibition -->
<ArtifactModal artifact={activeArtifact} onclose={closeModal} />
