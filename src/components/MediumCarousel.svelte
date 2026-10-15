<script lang="ts">
  import type { MediumArticle } from '../data/medium';

  let { articles = [] }: { articles: MediumArticle[] } = $props();

  let carouselTrack = $state<HTMLDivElement | null>(null);
  let activeIndex = $state(0);

  // Arrow buttons enabled state strictly derived from activeIndex
  let canScrollLeft = $derived(activeIndex > 0);
  let canScrollRight = $derived(activeIndex < articles.length - 1);

  let isNavigating = false;
  let navigateTimeout: ReturnType<typeof setTimeout> | null = null;

  function focusCard(index: number) {
    if (index < 0 || index >= articles.length) return;
    activeIndex = index;

    if (!carouselTrack) return;
    const children = Array.from(carouselTrack.children) as HTMLElement[];
    const target = children[index];
    if (!target) return;

    const trackRect = carouselTrack.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    isNavigating = true;
    if (navigateTimeout) clearTimeout(navigateTimeout);
    navigateTimeout = setTimeout(() => {
      isNavigating = false;
    }, 450);

    // Only scroll if target card is clipped or out of view
    if (targetRect.right > trackRect.right - 8) {
      const overflowRight = targetRect.right - trackRect.right + 24;
      carouselTrack.scrollBy({ left: overflowRight, behavior: 'smooth' });
    } else if (targetRect.left < trackRect.left + 8) {
      const overflowLeft = targetRect.left - trackRect.left - 24;
      carouselTrack.scrollBy({ left: overflowLeft, behavior: 'smooth' });
    }
    // If target card is already fully visible within view, do not scroll
  }

  function scrollPrev() {
    if (activeIndex > 0) {
      focusCard(activeIndex - 1);
    }
  }

  function scrollNext() {
    if (activeIndex < articles.length - 1) {
      focusCard(activeIndex + 1);
    }
  }

  function handleScroll() {
    if (isNavigating || !carouselTrack) return;

    const children = Array.from(carouselTrack.children) as HTMLElement[];
    const currentActive = children[activeIndex];
    const trackRect = carouselTrack.getBoundingClientRect();

    // If currently focused card is still visible, keep focus on it
    if (currentActive) {
      const rect = currentActive.getBoundingClientRect();
      if (rect.right > trackRect.left + 60 && rect.left < trackRect.right - 60) {
        return;
      }
    }

    // If user scrolled so far that active card is out of view, focus the leftmost visible card
    let bestIdx = 0;
    let minDiff = Infinity;
    children.forEach((child, idx) => {
      const rect = child.getBoundingClientRect();
      const diff = Math.abs(rect.left - trackRect.left);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = idx;
      }
    });

    activeIndex = bestIdx;
  }
</script>

<div class="space-y-8">
  <!-- Section Subtitle & Controls Bar -->
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-6">
    <div class="max-w-2xl space-y-3">
      <h2 class="text-3xl sm:text-4xl font-bold text-[#102f10] tracking-tight">
        perspectives & writing
      </h2>

      <p class="text-[#525252] text-sm sm:text-base leading-relaxed font-normal">
        Articles on marketing leadership, generative AI search optimization, and creative decision-making published on Medium.
      </p>
    </div>

    <!-- Actions & Navigation Controls -->
    <div class="flex items-center gap-3 sm:gap-4 shrink-0">
      <!-- Medium Profile External Link -->
      <a
        href="https://medium.com/@erikavictoriadane"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#dddedc] bg-white hover:bg-[#efeef1] text-[#102f10] text-xs font-bold tracking-wider uppercase transition-all shadow-sm"
      >
        <span>Profile</span>
        <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>
        </svg>
        <span class="text-xs">↗</span>
      </a>

      <!-- Carousel Navigation Arrows (Step through each card focus) -->
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          onclick={scrollPrev}
          disabled={!canScrollLeft}
          aria-label="Previous article"
          class={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
            canScrollLeft
              ? 'border-[#dddedc] bg-white text-[#102f10] hover:bg-[#102f10] hover:text-white hover:border-[#102f10] shadow-sm'
              : 'border-[#dddedc]/60 bg-white/60 text-[#84827e]/40 cursor-not-allowed'
          }`}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onclick={scrollNext}
          disabled={!canScrollRight}
          aria-label="Next article"
          class={`w-9 h-9 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
            canScrollRight
              ? 'border-[#dddedc] bg-white text-[#102f10] hover:bg-[#102f10] hover:text-white hover:border-[#102f10] shadow-sm'
              : 'border-[#dddedc]/60 bg-white/60 text-[#84827e]/40 cursor-not-allowed'
          }`}
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Carousel Scroll Track (Medium Classic Layout) -->
  <div
    bind:this={carouselTrack}
    onscroll={handleScroll}
    class="flex gap-5 sm:gap-6 overflow-x-auto scroll-smooth pb-4 pt-1 -mx-6 px-6 scrollbar-none"
    style="scrollbar-width: none; -ms-overflow-style: none;"
  >
    {#each articles as article, index (article.id)}
      <article
        onclick={() => focusCard(index)}
        class={`shrink-0 w-[86vw] sm:w-[420px] md:w-[460px] rounded-2xl bg-white p-4 sm:p-5 transition-all duration-300 group flex flex-col justify-between cursor-pointer ${
          activeIndex === index
            ? 'border-2 border-[#102f10] ring-1 ring-[#102f10] shadow-md'
            : 'border border-[#dddedc] shadow-sm hover:border-[#102f10]/40 hover:shadow-md'
        }`}
      >
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          class="flex flex-col h-full focus:outline-none rounded-xl"
        >
          <!-- Author Header Row -->
          <div class="flex items-center gap-2 mb-3">
            <div class="w-6 h-6 rounded-full bg-[#102f10] text-white flex items-center justify-center font-bold text-[9px] uppercase">
              ef
            </div>
            <div class="flex items-center gap-1.5 text-xs">
              <span class="font-bold text-[#102f10]">Erika Finnimore</span>
              <span class="text-[#84827e]">·</span>
              <span class="text-[11px] text-[#84827e]">{article.formattedDate}</span>
            </div>
          </div>

          <!-- Two-Column Story Row: Text Left, Thumbnail Right -->
          <div class="flex gap-4 items-start flex-1">
            <div class="flex-1 space-y-2">
              <h3 class="text-base sm:text-lg font-bold text-[#102f10] group-hover:text-[#184418] transition-colors leading-snug line-clamp-2">
                {article.title}
              </h3>
              <p class="text-xs sm:text-sm text-[#525252] leading-relaxed line-clamp-2 font-normal">
                {article.snippet}
              </p>
            </div>

            {#if article.imageUrl}
              <div class="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden bg-[#efeef1] border border-[#dddedc]/70">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  loading="lazy"
                />
              </div>
            {/if}
          </div>

          <!-- Bottom Story Metadata Row: Read Time on left, Read Link on right -->
          <div class="mt-4 pt-3 border-t border-[#dddedc]/60 flex items-center justify-between text-xs">
            <span class="text-[11px] text-[#84827e]">{article.readTime}</span>

            <div class="flex items-center gap-1 text-[11px] font-bold text-[#102f10] group-hover:text-[#184418]">
              <span>Read Story</span>
              <span>↗</span>
            </div>
          </div>
        </a>
      </article>
    {/each}
  </div>
</div>
