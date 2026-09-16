<script lang="ts">
  import { onMount } from 'svelte';

  export interface ArtifactItem {
    id: string;
    title: string;
    description: string;
    tags: string[];
    link?: string | null;
    showLiveLink?: boolean;
    date?: string | null;
    showDate?: boolean;
    order?: number | null;
    featured?: boolean;
    hidden?: boolean;
    previewImage?: string;
    metrics?: string;
    mediaType?: 'image' | 'video' | 'document';
    videoUrl?: string;
    galleryImages?: string[];
    body?: string;
  }

  let { artifacts = [] }: { artifacts: ArtifactItem[] } = $props();

  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  const isDev = import.meta.env.DEV;

  function resolveUrl(url?: string | null): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    if (url.startsWith('/') && !url.startsWith(`${baseUrl}/`)) {
      return `${baseUrl}${url}`;
    }
    return url;
  }

  // Reactive state
  // svelte-ignore state_referenced_locally
  let localArtifacts = $state<ArtifactItem[]>([...artifacts]);
  let selectedTag = $state('All');
  let searchQuery = $state('');
  let activeArtifact = $state<ArtifactItem | null>(null);
  let modalHeroImage = $state<string | null>(null);
  let dialogRef = $state<HTMLDialogElement | null>(null);

  // Dev-only state
  let devServerReady = $state(false);
  let editMode = $state(false);
  let editorDialogRef = $state<HTMLDialogElement | null>(null);
  let deleteDialogRef = $state<HTMLDialogElement | null>(null);
  let artifactToDelete = $state<ArtifactItem | null>(null);

  // Editor modal state
  let isCreatingNew = $state(false);
  let isSaving = $state(false);
  let isDeleting = $state(false);
  let editorError = $state<string | null>(null);
  let editorTab = $state<'edit' | 'preview'>('edit');
  let newTagInput = $state('');
  let newCollateralInput = $state('');
  let toastMessage = $state<string | null>(null);
  let toastTimeout: ReturnType<typeof setTimeout> | null = null;

  interface EditorFormState {
    id: string;
    slug: string;
    title: string;
    description: string;
    tags: string[];
    link: string;
    showLiveLink: boolean;
    date: string;
    showDate: boolean;
    order: number;
    featured: boolean;
    hidden: boolean;
    previewImage: string;
    metrics: string;
    mediaType: 'image' | 'video' | 'document';
    videoUrl: string;
    galleryImages: string[];
    body: string;
  }

  let editorData = $state<EditorFormState>({
    id: '',
    slug: '',
    title: '',
    description: '',
    tags: ['Campaigns'],
    link: '',
    showLiveLink: false,
    date: '',
    showDate: false,
    order: 1,
    featured: false,
    hidden: false,
    previewImage: '',
    metrics: '',
    mediaType: 'image',
    videoUrl: '',
    galleryImages: [],
    body: '',
  });

  // Check dev backend health check on mount
  onMount(() => {
    if (isDev) {
      fetch('/api/artifact/health')
        .then((res) => {
          if (res.ok) devServerReady = true;
        })
        .catch(() => {
          devServerReady = false;
        });
    }
  });

  // Sync prop changes (e.g. Astro hot reload)
  $effect(() => {
    localArtifacts = [...artifacts];
  });

  function showToast(msg: string) {
    toastMessage = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastMessage = null;
    }, 3500);
  }

  // Derive unique tags from local artifacts
  let allTags = $derived([
    'All',
    ...Array.from(new Set(localArtifacts.flatMap((a) => a.tags || []))).sort()
  ]);

  // Real-time filtered artifacts based on selected tag and search query
  let filteredArtifacts = $derived(
    localArtifacts
      .filter((item) => {
        const matchesTag = selectedTag === 'All' || (item.tags && item.tags.includes(selectedTag));
        const q = searchQuery.trim().toLowerCase();
        if (!q) return matchesTag;

        const matchesQuery =
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.tags && item.tags.some((t) => t.toLowerCase().includes(q))) ||
          (item.metrics && item.metrics.toLowerCase().includes(q));

        return matchesTag && matchesQuery;
      })
      .sort((a, b) => {
        const orderA = a.order !== null && a.order !== undefined ? Number(a.order) : Infinity;
        const orderB = b.order !== null && b.order !== undefined ? Number(b.order) : Infinity;
        if (orderA !== orderB) return orderA - orderB;
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      })
  );

  function openModal(item: ArtifactItem) {
    activeArtifact = item;
    modalHeroImage = item.previewImage || null;
    if (dialogRef) {
      dialogRef.showModal();
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (dialogRef && dialogRef.open) {
      dialogRef.close();
    }
    document.body.style.overflow = '';
  }

  function handleBackdropClick(event: MouseEvent) {
    if (dialogRef && event.target === dialogRef) {
      closeModal();
    }
  }

  function handleDialogClose() {
    document.body.style.overflow = '';
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
    if (url.match(/\.(mp4|webm|ogg)($|\?)/i) || url.startsWith('/videos/')) {
      return { type: 'video', src: resolveUrl(url) };
    }
    return { type: 'none', src: url };
  }

  function renderFormattedBody(markdown: string = ''): string {
    if (!markdown) return '';
    return markdown
      // Markdown Images: ![alt](url)
      .replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, src) => {
        const resolvedSrc = resolveUrl(src);
        const captionHtml = alt
          ? `<figcaption class="py-2.5 px-4 text-center text-xs font-mono text-stone-600 bg-white/95 border-t border-stone-200/80 flex items-center justify-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-stone-400 inline-block"></span>${alt}</figcaption>`
          : '';
        return `<figure class="my-6 rounded-xl overflow-hidden border border-stone-200/90 bg-stone-50 shadow-sm transition-all hover:shadow-md">
          <img src="${resolvedSrc}" alt="${alt || 'Artifact collateral visual'}" class="w-full h-auto object-cover max-h-[440px] block" loading="lazy" />
          ${captionHtml}
        </figure>`;
      })
      // Markdown Links: [text](url)
      .replace(/(?<!\!)\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-stone-900 underline underline-offset-2 font-semibold hover:text-stone-600 transition-colors">$1</a>')
      // Headings
      .replace(/^### (.*$)/gim, '<h4 class="font-serif text-lg font-bold text-stone-900 mt-7 mb-2.5 flex items-center gap-2.5"><span class="w-2 h-2 rounded-full bg-stone-700 inline-block"></span>$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 class="font-serif text-xl font-bold text-stone-900 mt-8 mb-3.5 border-b border-stone-200 pb-1.5">$1</h3>')
      // Typography
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-stone-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-stone-800">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-stone-100 text-stone-800 font-mono text-xs border border-stone-200">$1</code>')
      .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc text-stone-700 mb-2 leading-relaxed marker:text-stone-400">$1</li>')
      .replace(/\n\n/g, '<div class="h-3"></div>');
  }

  // --- DEV EDITOR ACTIONS ---

  function openEditorModal(item: ArtifactItem | null) {
    editorError = null;
    editorTab = 'edit';
    newTagInput = '';
    newCollateralInput = '';

    if (item) {
      isCreatingNew = false;
      editorData = {
        id: item.id,
        slug: item.id,
        title: item.title,
        description: item.description,
        tags: [...(item.tags || [])],
        link: item.link || '',
        showLiveLink: Boolean(item.showLiveLink),
        date: item.date ? item.date.split('T')[0] : new Date().toISOString().split('T')[0],
        showDate: Boolean(item.showDate),
        order: item.order || 1,
        featured: Boolean(item.featured),
        hidden: Boolean(item.hidden),
        previewImage: item.previewImage || '',
        metrics: item.metrics || '',
        mediaType: item.mediaType || 'image',
        videoUrl: item.videoUrl || '',
        galleryImages: [...(item.galleryImages || [])],
        body: item.body || '',
      };
    } else {
      isCreatingNew = true;
      editorData = {
        id: '',
        slug: '',
        title: '',
        description: '',
        tags: ['Campaigns'],
        link: '',
        showLiveLink: false,
        date: new Date().toISOString().split('T')[0],
        showDate: false,
        order: 1,
        featured: false,
        hidden: false,
        previewImage: '',
        metrics: '',
        mediaType: 'image',
        videoUrl: '',
        galleryImages: [],
        body: `### Strategic Overview\nProvide context on market dynamics, strategic positioning, and core objectives.\n\n### Narrative Direction & Execution\n- **Pillar 01**: Key initiative detail.\n- **Pillar 02**: Another strategic beat.\n\n### Commercial Impact & Outcomes\n- Key metric 01.\n- Key metric 02.\n`,
      };
    }

    if (editorDialogRef) {
      editorDialogRef.showModal();
      document.body.style.overflow = 'hidden';
    }
  }

  function closeEditorModal() {
    if (editorDialogRef && editorDialogRef.open) {
      editorDialogRef.close();
    }
    document.body.style.overflow = '';
  }

  function handleEditorBackdropClick(event: MouseEvent) {
    if (editorDialogRef && event.target === editorDialogRef) {
      closeEditorModal();
    }
  }

  function addTag() {
    const val = newTagInput.trim();
    if (val && !editorData.tags.includes(val)) {
      editorData.tags = [...editorData.tags, val];
      newTagInput = '';
    }
  }

  function removeTag(tagToRemove: string) {
    editorData.tags = editorData.tags.filter((t) => t !== tagToRemove);
  }

  function addCollateral() {
    const val = newCollateralInput.trim();
    if (val && !editorData.galleryImages.includes(val)) {
      editorData.galleryImages = [...editorData.galleryImages, val];
      newCollateralInput = '';
    }
  }

  function removeCollateral(idx: number) {
    editorData.galleryImages = editorData.galleryImages.filter((_, i) => i !== idx);
  }

  function insertMarkdownSnippet(snippet: string) {
    editorData.body = (editorData.body ? editorData.body + '\n\n' : '') + snippet;
  }

  let coverFileInput = $state<HTMLInputElement | null>(null);
  let videoFileInput = $state<HTMLInputElement | null>(null);
  let collateralFileInput = $state<HTMLInputElement | null>(null);
  let isUploadingMedia = $state(false);

  async function uploadMediaFile(file: File, type: 'image' | 'video'): Promise<string> {
    isUploadingMedia = true;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              data: base64,
              type,
            }),
          });
          const data = await res.json();
          if (!res.ok || data.error) throw new Error(data.error || 'Upload failed');
          resolve(data.url);
        } catch (err) {
          reject(err);
        } finally {
          isUploadingMedia = false;
        }
      };
      reader.onerror = (e) => {
        isUploadingMedia = false;
        reject(e);
      };
      reader.readAsDataURL(file);
    });
  }

  async function onCoverFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      try {
        const url = await uploadMediaFile(input.files[0], 'image');
        editorData.previewImage = url;
        showToast('Cover image uploaded to /previews/!');
      } catch (err: any) {
        editorError = `Upload error: ${err.message}`;
      }
    }
  }

  async function onVideoFileSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      try {
        const url = await uploadMediaFile(input.files[0], 'video');
        editorData.videoUrl = url;
        showToast('Video uploaded to /videos/!');
      } catch (err: any) {
        editorError = `Upload error: ${err.message}`;
      }
    }
  }

  async function onCollateralFilesSelected(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      try {
        for (let i = 0; i < input.files.length; i++) {
          const url = await uploadMediaFile(input.files[i], 'image');
          if (!editorData.galleryImages.includes(url)) {
            editorData.galleryImages = [...editorData.galleryImages, url];
          }
        }
        showToast('Collateral assets uploaded to /previews/!');
      } catch (err: any) {
        editorError = `Upload error: ${err.message}`;
      }
    }
  }

  async function saveArtifact() {
    if (!editorData.title.trim()) {
      editorError = 'Title is required.';
      return;
    }
    if (!editorData.description.trim()) {
      editorError = 'Description is required.';
      return;
    }

    isSaving = true;
    editorError = null;

    try {
      const endpoint = '/api/artifact';
      const method = isCreatingNew ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editorData)
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to save artifact');
      }

      // Refresh local state
      const savedArtifact: ArtifactItem = {
        id: result.artifact?.id || editorData.id,
        title: editorData.title.trim(),
        description: editorData.description.trim(),
        tags: [...editorData.tags],
        link: editorData.link.trim() || null,
        showLiveLink: editorData.showLiveLink,
        date: editorData.date,
        showDate: editorData.showDate,
        order: Number(editorData.order),
        featured: editorData.featured,
        hidden: editorData.hidden,
        previewImage: editorData.previewImage.trim(),
        metrics: editorData.metrics.trim(),
        mediaType: editorData.mediaType,
        videoUrl: editorData.videoUrl.trim(),
        galleryImages: [...editorData.galleryImages],
        body: editorData.body
      };

      if (isCreatingNew) {
        localArtifacts = [savedArtifact, ...localArtifacts.map((a) => ({ ...a, order: (a.order || 1) + 1 }))];
      } else {
        localArtifacts = localArtifacts.map((a) => (a.id === savedArtifact.id ? savedArtifact : a));
      }

      closeEditorModal();
      showToast(isCreatingNew ? `Created "${savedArtifact.title}"` : `Saved "${savedArtifact.title}"`);
    } catch (err: any) {
      editorError = err.message || 'An unexpected error occurred while saving';
    } finally {
      isSaving = false;
    }
  }

  function promptDeleteArtifact(artifact: ArtifactItem) {
    artifactToDelete = artifact;
    if (deleteDialogRef) {
      deleteDialogRef.showModal();
    }
  }

  function closeDeleteDialog() {
    if (deleteDialogRef && deleteDialogRef.open) {
      deleteDialogRef.close();
    }
    artifactToDelete = null;
  }

  async function confirmDeleteArtifact() {
    if (!artifactToDelete) return;
    isDeleting = true;

    try {
      const response = await fetch(`/api/artifact?slug=${encodeURIComponent(artifactToDelete.id)}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to remove artifact');
      }

      const deletedTitle = artifactToDelete.title;
      localArtifacts = localArtifacts.filter((a) => a.id !== artifactToDelete?.id);

      closeDeleteDialog();
      if (editorDialogRef && editorDialogRef.open && editorData.id === artifactToDelete?.id) {
        closeEditorModal();
      }

      showToast(`Removed "${deletedTitle}"`);
    } catch (err: any) {
      alert(`Error deleting artifact: ${err.message}`);
    } finally {
      isDeleting = false;
    }
  }

  async function quickToggleHidden(artifact: ArtifactItem) {
    const newHidden = !artifact.hidden;
    try {
      const res = await fetch('/api/artifact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: artifact.id,
          hidden: newHidden
        })
      });
      if (res.ok) {
        artifact.hidden = newHidden;
        localArtifacts = localArtifacts.map((a) => (a.id === artifact.id ? { ...a, hidden: newHidden } : a));
        showToast(`Artifact ${newHidden ? 'hidden' : 'published'}`);
      }
    } catch (e) {
      console.error('Failed to toggle visibility:', e);
    }
  }
</script>

<div class="w-full relative">
  <!-- Toast Notification Alert -->
  {#if toastMessage}
    <div
      class="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-stone-900 text-stone-50 text-xs font-mono shadow-2xl flex items-center gap-2 border border-stone-700 animate-bounce"
    >
      <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
      {toastMessage}
    </div>
  {/if}

  <!-- Curatorial Filter & Search Bar -->
  <div class="mb-10 space-y-6">
    <div class="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
      <!-- Search Input & Dev Action Controls -->
      <div class="flex flex-wrap items-center gap-3 flex-1 max-w-2xl">
        <div class="relative flex-1 min-w-[240px]">
          <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search by campaign, channel, or impact..."
            class="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-300/80 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400/50 focus:border-stone-500 transition-all shadow-sm"
            aria-label="Filter portfolio artifacts"
          />
          {#if searchQuery}
            <button
              type="button"
              onclick={() => (searchQuery = '')}
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
              aria-label="Clear search query"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>

        <!-- Dev Mode: "Edit Gallery" Button & "Create Artifact" Button -->
        {#if isDev && devServerReady}
          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onclick={() => (editMode = !editMode)}
              class="px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-all cursor-pointer shadow-sm {editMode
                ? 'bg-amber-600 text-stone-50 ring-2 ring-amber-500/80'
                : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-100 hover:text-stone-900'}"
              aria-label="Toggle Artifact Edit Mode"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>{editMode ? 'Editing Active' : 'Edit Gallery'}</span>
            </button>

            {#if editMode}
              <button
                type="button"
                onclick={() => openEditorModal(null)}
                class="px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide bg-stone-900 text-stone-50 hover:bg-stone-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                aria-label="Create New Artifact"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Artifact</span>
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Exhibition Counter -->
      <div class="text-xs font-mono text-stone-500 flex items-center gap-2 shrink-0">
        <span class="w-2 h-2 rounded-full bg-stone-700"></span>
        Displaying <span class="text-stone-900 font-semibold">{filteredArtifacts.length}</span> {filteredArtifacts.length === 1 ? 'case study' : 'case studies'}
      </div>
    </div>

    <!-- Gallery Wings Filter Strip -->
    <div class="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-200">
      <span class="text-xs font-mono font-semibold uppercase tracking-wider text-stone-400 mr-2">Discipline:</span>
      {#each allTags as tag}
        <button
          type="button"
          onclick={() => (selectedTag = tag)}
          class="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer {selectedTag === tag
            ? 'bg-stone-900 text-stone-50 shadow-sm ring-1 ring-stone-900 font-semibold'
            : 'bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 border border-stone-200'}"
        >
          {tag}
          {#if tag !== 'All'}
            <span class="ml-1 opacity-70 text-[10px]">
              ({localArtifacts.filter((a) => a.tags && a.tags.includes(tag)).length})
            </span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Gallery Wall Grid -->
  {#if filteredArtifacts.length === 0}
    <div class="py-20 text-center rounded-2xl border border-dashed border-stone-300 bg-stone-100/60 p-8">
      <p class="font-serif text-lg text-stone-600 mb-4">No campaign artifacts match the selected criteria.</p>
      <button
        type="button"
        onclick={() => {
          selectedTag = 'All';
          searchQuery = '';
        }}
        class="px-4 py-2 text-xs font-medium rounded-full bg-stone-900 text-stone-50 hover:bg-stone-800 transition cursor-pointer"
      >
        Reset gallery filters
      </button>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {#each filteredArtifacts as artifact (artifact.id)}
        <article
          class="group relative flex flex-col bg-white border border-stone-200/90 rounded-2xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300"
        >
          <!-- Artifact Preview Frame (Accessible Button) -->
          <button
            type="button"
            class="relative w-full aspect-[16/10] overflow-hidden bg-stone-100 border-b border-stone-100 cursor-pointer block text-left p-0 border-0"
            onclick={() => openModal(artifact)}
            aria-label={"Examine case study: " + artifact.title}
          >
            {#if artifact.previewImage}
              <img
                src={resolveUrl(artifact.previewImage)}
                alt={artifact.title}
                class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                loading="lazy"
              />
            {:else}
              <div class="w-full h-full flex items-center justify-center bg-stone-200 text-stone-400 font-serif italic">
                Visual preview unavailable
              </div>
            {/if}

            <!-- Video Play Button Overlay on Card -->
            {#if artifact.mediaType === 'video'}
              <div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div class="w-11 h-11 rounded-full bg-stone-900/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm border border-white/20">
                  <svg class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            {/if}

            <!-- Visual Overlay Badges -->
            <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                {#if artifact.hidden}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-stone-700/90 text-stone-200 backdrop-blur-md shadow-sm shrink-0 flex items-center gap-1">
                    <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                    Hidden
                  </span>
                {/if}
                {#if artifact.featured}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-stone-900/90 text-stone-50 backdrop-blur-md shadow-sm shrink-0">
                    Featured
                  </span>
                {/if}
                {#if artifact.mediaType === 'video'}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-amber-600/90 text-stone-50 backdrop-blur-md shadow-sm shrink-0 flex items-center gap-1">
                    <svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Video
                  </span>
                {:else if artifact.mediaType === 'document'}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-stone-800/80 text-stone-50 backdrop-blur-md shadow-sm shrink-0">
                    Doc
                  </span>
                {/if}
              </div>

              {#if artifact.metrics}
                <span class="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-semibold bg-white/95 text-stone-900 shadow-md backdrop-blur-md border border-stone-200/60 truncate">
                  {artifact.metrics}
                </span>
              {/if}
            </div>
          </button>

          <!-- Exhibition Placard (Card Content) -->
          <div class="p-5 sm:p-6 flex flex-col justify-between flex-1 space-y-4">
            <div>
              <!-- Tag Badges Strip -->
              <div class="flex flex-wrap gap-1.5 mb-2.5">
                {#each artifact.tags as tag}
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200/70">
                    {tag}
                  </span>
                {/each}
              </div>

              <!-- Campaign Title (Accessible Button) -->
              <h3 class="leading-snug mb-2 line-clamp-2">
                <button
                  type="button"
                  class="text-left font-serif text-lg sm:text-xl font-bold text-stone-900 group-hover:text-stone-700 transition-colors cursor-pointer p-0 border-0 bg-transparent"
                  onclick={() => openModal(artifact)}
                >
                  {artifact.title}
                </button>
              </h3>

              <!-- Narrative Summary -->
              <p class="text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-3">
                {artifact.description}
              </p>
            </div>

            <!-- Placard Action Footer -->
            <div class="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                {#if isDev && editMode}
                  <!-- Dev Edit Pencil Icon -->
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation();
                      openEditorModal(artifact);
                    }}
                    class="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-900 hover:text-stone-50 transition cursor-pointer"
                    title="Edit artifact"
                    aria-label={"Edit artifact: " + artifact.title}
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>

                  <!-- Dev Trash Delete Icon -->
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation();
                      promptDeleteArtifact(artifact);
                    }}
                    class="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                    title="Delete artifact"
                    aria-label={"Delete artifact: " + artifact.title}
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <!-- Quick Visibility Toggle Icon -->
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation();
                      quickToggleHidden(artifact);
                    }}
                    class="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-amber-600 hover:text-white transition cursor-pointer"
                    title={artifact.hidden ? 'Unhide artifact' : 'Hide artifact'}
                    aria-label={artifact.hidden ? 'Unhide artifact' : 'Hide artifact'}
                  >
                    {#if artifact.hidden}
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    {:else}
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    {/if}
                  </button>
                {:else if artifact.showDate && artifact.date}
                  <span class="text-[11px] font-mono text-stone-400 shrink-0">
                    {new Date(artifact.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
                  </span>
                {/if}
              </div>

              <button
                type="button"
                onclick={() => openModal(artifact)}
                class="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-stone-900 text-stone-50 hover:bg-stone-800 focus:ring-2 focus:ring-stone-400 focus:outline-none transition-all cursor-pointer shadow-sm group-hover:shadow shrink-0 ml-auto"
                aria-haspopup="dialog"
              >
                <span>{artifact.mediaType === 'video' ? 'Watch' : 'Examine'}</span>
                <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </article>
      {/each}
    </div>
  {/if}

  <!-- Lightbox Modal (<dialog>) -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
  <dialog
    bind:this={dialogRef}
    onclick={handleBackdropClick}
    onclose={handleDialogClose}
    class="backdrop:bg-stone-950/60 backdrop:backdrop-blur-sm bg-transparent p-4 max-w-3xl w-full max-h-[92vh] focus:outline-none m-auto"
  >
    {#if activeArtifact}
      <div
        class="bg-[#faf8f5] border border-stone-300/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] text-stone-800"
      >
        <!-- Lightbox Sticky Header -->
        <div class="p-5 px-6 border-b border-stone-200 bg-white/95 backdrop-blur-md sticky top-0 z-20 flex items-start justify-between gap-4">
          <div class="space-y-1.5">
            <div class="flex flex-wrap gap-1.5 items-center">
              {#each activeArtifact.tags as tag}
                <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-stone-100 text-stone-800 border border-stone-200">
                  {tag}
                </span>
              {/each}
              {#if activeArtifact.mediaType === 'video'}
                <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-amber-600 text-stone-50 flex items-center gap-1">
                  <svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Video Showcase
                </span>
              {/if}
              {#if activeArtifact.metrics}
                <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-stone-900 text-stone-50">
                  {activeArtifact.metrics}
                </span>
              {/if}
            </div>
            <h2 class="font-serif text-2xl sm:text-3xl font-bold text-stone-900 leading-snug">
              {activeArtifact.title}
            </h2>
          </div>

          <button
            type="button"
            onclick={closeModal}
            class="p-2 rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
            aria-label="Close case study dialog"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Lightbox Scrollable Content -->
        <div class="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm">
          <!-- Media Preview (Interactive Video Player or Large Visual Artwork) -->
          {#if activeArtifact.mediaType === 'video' && activeArtifact.videoUrl && modalHeroImage === activeArtifact.previewImage}
            {@const embed = getEmbedUrl(activeArtifact.videoUrl)}
            <div class="rounded-xl overflow-hidden border border-stone-200 shadow-lg bg-black aspect-video w-full">
              {#if embed.type === 'youtube' || embed.type === 'vimeo'}
                <iframe
                  src={embed.src}
                  title={activeArtifact.title}
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
                  poster={resolveUrl(activeArtifact.previewImage)}
                  class="w-full h-full object-contain bg-black"
                >
                  <track kind="captions" />
                  Your browser does not support the video tag.
                </video>
              {:else if activeArtifact.previewImage}
                <img
                  src={resolveUrl(activeArtifact.previewImage)}
                  alt={activeArtifact.title}
                  class="w-full h-full object-cover object-center"
                />
              {/if}
            </div>
          {:else if modalHeroImage}
            <div class="relative rounded-xl overflow-hidden border border-stone-200 shadow-md bg-stone-100 max-h-96 group/preview">
              <img
                src={resolveUrl(modalHeroImage)}
                alt={activeArtifact.title}
                class="w-full h-full object-cover object-center"
              />
              {#if activeArtifact.mediaType === 'video' && activeArtifact.videoUrl && modalHeroImage !== activeArtifact.previewImage}
                <button
                  type="button"
                  onclick={() => {
                    modalHeroImage = activeArtifact?.previewImage || null;
                  }}
                  class="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-mono bg-stone-900/90 text-stone-50 hover:bg-stone-900 transition-colors shadow-md backdrop-blur-sm cursor-pointer flex items-center gap-1.5"
                >
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Return to Video
                </button>
              {:else if activeArtifact.previewImage && modalHeroImage !== activeArtifact.previewImage}
                <button
                  type="button"
                  onclick={() => {
                    modalHeroImage = activeArtifact?.previewImage || null;
                  }}
                  class="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-mono bg-stone-900/90 text-stone-50 hover:bg-stone-900 transition-colors shadow-md backdrop-blur-sm cursor-pointer"
                >
                  Reset to Cover
                </button>
              {/if}
            </div>
          {/if}

          <!-- Executive Summary Callout -->
          <div class="p-5 rounded-xl bg-white border border-stone-200/90 shadow-sm text-stone-700 leading-relaxed font-normal">
            <span class="font-mono text-xs uppercase tracking-wider text-stone-400 block mb-1">Executive Summary</span>
            {activeArtifact.description}
          </div>

          <!-- Markdown Case Study Body (Supports inline images ![Alt](url)) -->
          {#if activeArtifact.body}
            <div class="prose prose-stone max-w-none text-stone-700">
              {@html renderFormattedBody(activeArtifact.body)}
            </div>
          {/if}

          <!-- Supporting Collateral / Gallery Images (Optional) -->
          {#if activeArtifact.galleryImages && activeArtifact.galleryImages.length > 0}
            <div class="space-y-3 pt-4 border-t border-stone-200/90">
              <div class="flex items-center justify-between">
                <h4 class="font-serif text-base font-bold text-stone-900 flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-stone-700 inline-block"></span>
                  Supporting Collateral & Assets ({activeArtifact.galleryImages.length})
                </h4>
                <span class="text-[11px] font-mono text-stone-500">Curated Exhibition</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {#each activeArtifact.galleryImages as imgUrl, idx}
                  <button
                    type="button"
                    class="group/asset relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100 shadow-sm hover:shadow-md transition-all text-left cursor-pointer p-0 block w-full focus:outline-none focus:ring-2 focus:ring-stone-400"
                    onclick={() => {
                      modalHeroImage = imgUrl;
                    }}
                    aria-label={`View collateral visual ${idx + 1}`}
                  >
                    <img
                      src={resolveUrl(imgUrl)}
                      alt={`${activeArtifact.title} collateral ${idx + 1}`}
                      class="w-full h-44 object-cover object-center group-hover/asset:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div class="absolute inset-0 bg-stone-900/10 group-hover/asset:bg-stone-900/20 transition-colors"></div>
                    <div class="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-full bg-stone-900/85 text-[10px] font-mono text-stone-100 backdrop-blur-sm opacity-0 group-hover/asset:opacity-100 transition-opacity flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Feature in preview
                    </div>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Lightbox Footer -->
        <div class="p-4 px-6 border-t border-stone-200 bg-white flex items-center justify-between gap-4">
          <div class="text-xs font-mono text-stone-500">
            {#if activeArtifact.showDate && activeArtifact.date}
              Archived on {new Date(activeArtifact.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
            {/if}
          </div>

          <div class="flex items-center gap-3">
            {#if activeArtifact.showLiveLink && activeArtifact.link}
              <a
                href={activeArtifact.link}
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-stone-900 text-stone-50 hover:bg-stone-800 transition shadow-sm"
              >
                <span>View Live Project</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            {/if}
            <button
              type="button"
              onclick={closeModal}
              class="px-4 py-2 rounded-full text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    {/if}
  </dialog>

  <!-- =========================================================================
       DEV-ONLY: ARTIFACT EDITOR MODAL (<dialog>)
       ========================================================================= -->
  {#if isDev}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <dialog
      bind:this={editorDialogRef}
      onclick={handleEditorBackdropClick}
      class="backdrop:bg-stone-950/70 backdrop:backdrop-blur-sm bg-transparent p-4 max-w-3xl w-full max-h-[94vh] focus:outline-none m-auto"
    >
      <div class="bg-[#faf8f5] border border-stone-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-stone-800">
        <!-- Editor Header -->
        <div class="p-5 px-6 border-b border-stone-200 bg-white sticky top-0 z-30 flex items-start justify-between gap-4">
          <div class="space-y-3 flex-1">
            <!-- Tags & Media Badges Row -->
            <div class="flex flex-wrap items-center gap-2">
              <!-- Tags list -->
              {#each editorData.tags as tag}
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-stone-100 text-stone-800 border border-stone-300">
                  {tag}
                  <button
                    type="button"
                    onclick={() => removeTag(tag)}
                    class="hover:text-rose-600 text-stone-400 text-xs font-bold cursor-pointer"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              {/each}

              <!-- Tag Input -->
              <div class="inline-flex items-center gap-1">
                <input
                  type="text"
                  placeholder="+ Tag"
                  bind:value={newTagInput}
                  onkeydown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  class="px-2 py-0.5 rounded-full text-xs font-mono border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 w-20 placeholder-stone-400"
                />
                <button
                  type="button"
                  onclick={addTag}
                  class="p-0.5 rounded-full hover:bg-stone-200 text-stone-600 cursor-pointer text-xs"
                  title="Add tag"
                >
                  +
                </button>
              </div>

              <!-- Media Type Selector -->
              <div class="ml-auto flex items-center bg-stone-100 p-0.5 rounded-full border border-stone-300">
                <button
                  type="button"
                  onclick={() => (editorData.mediaType = 'image')}
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-mono transition cursor-pointer {editorData.mediaType === 'image'
                    ? 'bg-stone-900 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'}"
                >
                  Image
                </button>
                <button
                  type="button"
                  onclick={() => (editorData.mediaType = 'video')}
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-mono transition cursor-pointer {editorData.mediaType === 'video'
                    ? 'bg-amber-600 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'}"
                >
                  Video
                </button>
                <button
                  type="button"
                  onclick={() => (editorData.mediaType = 'document')}
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-mono transition cursor-pointer {editorData.mediaType === 'document'
                    ? 'bg-stone-800 text-white font-semibold shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'}"
                >
                  Doc
                </button>
              </div>
            </div>

            <!-- Title & Metric Input Row -->
            <div class="space-y-2">
              <input
                type="text"
                bind:value={editorData.title}
                placeholder="Case Study Title * (Required)"
                class="w-full font-serif text-2xl sm:text-3xl font-bold text-stone-900 border-b border-dashed border-stone-300 focus:border-stone-900 focus:outline-none bg-transparent py-1 placeholder-stone-400 transition"
              />

              <div class="flex flex-wrap items-center gap-3 text-xs">
                <!-- Metric Input -->
                <div class="flex items-center gap-1.5">
                  <span class="font-mono text-stone-500 uppercase tracking-wider text-[10px]">KPI Metric:</span>
                  <input
                    type="text"
                    bind:value={editorData.metrics}
                    placeholder="+240% Sales Target"
                    class="px-2.5 py-1 rounded-md text-xs font-mono border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder-stone-400"
                  />
                </div>

                <!-- Visibility Checkbox -->
                <label class="flex items-center gap-1.5 cursor-pointer ml-auto font-mono text-[11px] text-stone-600 select-none">
                  <input
                    type="checkbox"
                    bind:checked={editorData.hidden}
                    class="rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>Hide from public site (Draft)</span>
                </label>
              </div>
            </div>
          </div>

          <button
            type="button"
            onclick={closeEditorModal}
            class="p-2 rounded-full text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
            aria-label="Close editor"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Editor Scrollable Body -->
        <div class="p-6 sm:p-8 overflow-y-auto space-y-6 text-sm">
          {#if editorError}
            <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <svg class="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{editorError}</span>
            </div>
          {/if}

          <!-- Media Configuration -->
          <div class="p-4 rounded-xl bg-white border border-stone-200 shadow-sm space-y-3">
            <div class="font-mono text-xs uppercase tracking-wider text-stone-500 font-bold flex items-center justify-between">
              <span>Media & Visual Assets</span>
              <span class="text-[10px] font-normal text-stone-400">Previews live in /previews/</span>
            </div>

            <!-- Preview Image Path -->
            <div>
              <label for="editor-preview-image" class="block text-[11px] font-mono text-stone-600 mb-1">
                Thumbnail / Cover Image Path:
              </label>
              <div class="flex items-center gap-2">
                <input
                  id="editor-preview-image"
                  type="text"
                  bind:value={editorData.previewImage}
                  placeholder="e.g. ~/Downloads/cover.jpg or /previews/campaign.jpg"
                  class="flex-1 px-3 py-2 rounded-lg text-xs font-mono border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
                <input
                  type="file"
                  accept="image/*"
                  bind:this={coverFileInput}
                  onchange={onCoverFileSelected}
                  class="hidden"
                />
                <button
                  type="button"
                  onclick={() => coverFileInput?.click()}
                  class="px-3 py-2 rounded-lg text-xs font-mono font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition cursor-pointer shrink-0"
                >
                  Choose File
                </button>
              </div>
              <p class="text-[10px] font-mono text-stone-400 mt-1">
                💡 Paste any local path (e.g. <code class="bg-stone-100 px-1 py-0.5 rounded">~/Downloads/cover.jpg</code>), and it will automatically copy into <code class="bg-stone-100 px-1 py-0.5 rounded">/previews/</code> on save!
              </p>
            </div>

            <!-- Video Embed URL (if video) -->
            {#if editorData.mediaType === 'video'}
              <div>
                <label for="editor-video-url" class="block text-[11px] font-mono text-stone-600 mb-1">
                  Video URL (YouTube, Vimeo, or local .mp4/.webm):
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="editor-video-url"
                    type="text"
                    bind:value={editorData.videoUrl}
                    placeholder="YouTube, Vimeo, ~/Downloads/video.mp4, or /videos/campaign.mp4"
                    class="flex-1 px-3 py-2 rounded-lg text-xs font-mono border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-400"
                  />
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    bind:this={videoFileInput}
                    onchange={onVideoFileSelected}
                    class="hidden"
                  />
                  <button
                    type="button"
                    onclick={() => videoFileInput?.click()}
                    class="px-3 py-2 rounded-lg text-xs font-mono font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition cursor-pointer shrink-0"
                  >
                    Upload Video
                  </button>
                </div>
                <p class="text-[10px] font-mono text-stone-400 mt-1">
                  💡 Paste YouTube/Vimeo links for streaming, or paste local paths (e.g. <code class="bg-stone-100 px-1 py-0.5 rounded">~/Downloads/demo.mp4</code>) to copy into <code class="bg-stone-100 px-1 py-0.5 rounded">/videos/</code>.
                </p>
              </div>
            {/if}

            <!-- Live Media Preview Frame -->
            {#if editorData.previewImage || editorData.videoUrl}
              <div class="mt-2 rounded-xl overflow-hidden border border-stone-200 bg-black aspect-video max-h-56 relative flex items-center justify-center">
                {#if editorData.mediaType === 'video' && editorData.videoUrl}
                  {@const embed = getEmbedUrl(editorData.videoUrl)}
                  {#if embed.type === 'youtube' || embed.type === 'vimeo'}
                    <iframe
                      src={embed.src}
                      title="Video preview"
                      class="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowfullscreen
                    ></iframe>
                  {:else if embed.type === 'video'}
                    <video
                      src={embed.src}
                      controls
                      playsinline
                      poster={resolveUrl(editorData.previewImage)}
                      class="w-full h-full object-contain"
                    >
                      <track kind="captions" />
                    </video>
                  {:else}
                    <div class="text-stone-400 font-mono text-xs">Direct video preview: {editorData.videoUrl}</div>
                  {/if}
                {:else if editorData.previewImage}
                  <img
                    src={resolveUrl(editorData.previewImage)}
                    alt="Cover preview"
                    class="w-full h-full object-cover"
                  />
                {/if}
              </div>
            {/if}
          </div>

          <!-- Executive Summary -->
          <div class="p-5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-2">
            <label for="editor-description" class="font-mono text-xs uppercase tracking-wider text-stone-500 font-bold block">
              Executive Summary * (Required)
            </label>
            <textarea
              id="editor-description"
              bind:value={editorData.description}
              rows="3"
              placeholder="1-2 sentences summarizing the case study, core strategic challenge, and business results..."
              class="w-full text-sm text-stone-700 leading-relaxed border border-stone-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-stone-400 resize-y"
            ></textarea>
          </div>

          <!-- Markdown Case Study Narrative Body -->
          <div class="p-5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2.5">
              <div class="font-mono text-xs uppercase tracking-wider text-stone-500 font-bold">
                Case Study Narrative (Markdown)
              </div>

              <!-- Tab Switcher -->
              <div class="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                <button
                  type="button"
                  onclick={() => (editorTab = 'edit')}
                  class="px-3 py-1 rounded-md text-xs font-mono transition cursor-pointer {editorTab === 'edit'
                    ? 'bg-white text-stone-900 shadow-sm font-semibold'
                    : 'text-stone-600 hover:text-stone-900'}"
                >
                  Write Markdown
                </button>
                <button
                  type="button"
                  onclick={() => (editorTab = 'preview')}
                  class="px-3 py-1 rounded-md text-xs font-mono transition cursor-pointer {editorTab === 'preview'
                    ? 'bg-white text-stone-900 shadow-sm font-semibold'
                    : 'text-stone-600 hover:text-stone-900'}"
                >
                  Live Preview
                </button>
              </div>
            </div>

            <!-- Markdown Quick Toolbar -->
            {#if editorTab === 'edit'}
              <div class="flex flex-wrap items-center gap-1.5 text-xs font-mono text-stone-600">
                <button
                  type="button"
                  onclick={() => insertMarkdownSnippet('## Section Title\nNarrative content here...')}
                  class="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 transition cursor-pointer border border-stone-200"
                >
                  + H2
                </button>
                <button
                  type="button"
                  onclick={() => insertMarkdownSnippet('### Subheading Title\nDetails here...')}
                  class="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 transition cursor-pointer border border-stone-200"
                >
                  + H3
                </button>
                <button
                  type="button"
                  onclick={() => insertMarkdownSnippet('**Key bold highlight**')}
                  class="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 transition cursor-pointer border border-stone-200"
                >
                  Bold
                </button>
                <button
                  type="button"
                  onclick={() => insertMarkdownSnippet('- Bullet point 01\n- Bullet point 02')}
                  class="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 transition cursor-pointer border border-stone-200"
                >
                  List
                </button>
                <button
                  type="button"
                  onclick={() => insertMarkdownSnippet('![Descriptive caption of visual](/previews/image.jpg)')}
                  class="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 transition cursor-pointer border border-stone-200"
                >
                  + Image
                </button>
              </div>

              <textarea
                bind:value={editorData.body}
                rows="12"
                placeholder="Write your in-depth case study markdown here. Use ## for major headings, ### for subheadings, - for bullets, and ![Caption](/previews/file.jpg) for inline figures..."
                class="w-full text-xs font-mono text-stone-800 leading-relaxed border border-stone-200 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-stone-400 resize-y"
              ></textarea>
            {:else}
              <div class="min-h-[220px] p-4 rounded-lg bg-stone-50 border border-stone-200 prose prose-stone max-w-none text-sm">
                {@html renderFormattedBody(editorData.body)}
              </div>
            {/if}
          </div>

          <!-- Supporting Collateral Images -->
          <div class="p-5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-3">
            <div class="font-mono text-xs uppercase tracking-wider text-stone-500 font-bold flex items-center justify-between">
              <span>Collateral Exhibition Grid ({editorData.galleryImages.length})</span>
              <span class="text-[10px] font-normal text-stone-400">Shown beneath case narrative</span>
            </div>

            {#if editorData.galleryImages.length > 0}
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {#each editorData.galleryImages as imgPath, idx}
                  <div class="relative group rounded-lg overflow-hidden border border-stone-200 bg-stone-100 aspect-video">
                    <img
                      src={resolveUrl(imgPath)}
                      alt="Collateral"
                      class="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onclick={() => removeCollateral(idx)}
                      class="absolute top-1.5 right-1.5 p-1 rounded-full bg-stone-900/80 hover:bg-rose-600 text-white transition cursor-pointer"
                      title="Remove image"
                      aria-label="Remove collateral image"
                    >
                      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            {/if}

            <div class="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. ~/Downloads/packaging.jpg or /previews/packaging.jpg"
                bind:value={newCollateralInput}
                onkeydown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCollateral();
                  }
                }}
                class="flex-1 px-3 py-2 rounded-lg text-xs font-mono border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
              <button
                type="button"
                onclick={addCollateral}
                class="px-3 py-2 rounded-lg text-xs font-mono font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 transition cursor-pointer shrink-0"
              >
                + Add Path
              </button>
              <input
                type="file"
                accept="image/*"
                multiple
                bind:this={collateralFileInput}
                onchange={onCollateralFilesSelected}
                class="hidden"
              />
              <button
                type="button"
                onclick={() => collateralFileInput?.click()}
                class="px-3.5 py-2 rounded-lg text-xs font-mono font-medium bg-stone-900 text-stone-50 hover:bg-stone-800 transition cursor-pointer shrink-0 shadow-sm"
              >
                Upload Images
              </button>
            </div>
            <p class="text-[10px] font-mono text-stone-400">
              💡 Paste any local image paths or click Upload Images to auto-import into <code class="bg-stone-100 px-1 py-0.5 rounded">/previews/</code>.
            </p>
          </div>

          <!-- Configuration & Metadata Settings -->
          <div class="p-5 rounded-xl bg-white border border-stone-200 shadow-sm space-y-4">
            <div class="font-mono text-xs uppercase tracking-wider text-stone-500 font-bold">
              Gallery Placement & External Links
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <!-- Order -->
              <div>
                <label for="editor-order" class="block text-stone-600 mb-1">
                  Sort Order (1 = Top Left):
                </label>
                <input
                  id="editor-order"
                  type="number"
                  bind:value={editorData.order}
                  min="1"
                  class="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <!-- Date -->
              <div>
                <label for="editor-date" class="block text-stone-600 mb-1">
                  Date:
                </label>
                <input
                  id="editor-date"
                  type="date"
                  bind:value={editorData.date}
                  class="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <!-- External Live Link -->
              <div class="sm:col-span-2 space-y-2">
                <label for="editor-link" class="block text-stone-600">
                  External Live Project Link (optional):
                </label>
                <input
                  id="editor-link"
                  type="url"
                  placeholder="https://example.com/live-campaign"
                  bind:value={editorData.link}
                  class="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-400"
                />
              </div>
            </div>

            <!-- Toggles Row -->
            <div class="pt-2 border-t border-stone-200 flex flex-wrap items-center gap-5 text-xs font-mono text-stone-700">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  bind:checked={editorData.featured}
                  class="rounded border-stone-300 text-stone-900 focus:ring-stone-400 cursor-pointer"
                />
                <span>Mark as Featured</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  bind:checked={editorData.showLiveLink}
                  class="rounded border-stone-300 text-stone-900 focus:ring-stone-400 cursor-pointer"
                />
                <span>Show "View Live Project" Button</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  bind:checked={editorData.showDate}
                  class="rounded border-stone-300 text-stone-900 focus:ring-stone-400 cursor-pointer"
                />
                <span>Show Date in Modal</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Editor Sticky Footer -->
        <div class="p-4 px-6 border-t border-stone-200 bg-white flex items-center justify-between gap-4 sticky bottom-0 z-30">
          <div>
            {#if !isCreatingNew}
              <button
                type="button"
                onclick={() => promptDeleteArtifact(localArtifacts.find((a) => a.id === editorData.id) || null)}
                class="px-4 py-2 rounded-full text-xs font-mono text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
              >
                Delete Artifact
              </button>
            {/if}
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              onclick={closeEditorModal}
              class="px-4 py-2 rounded-full text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onclick={saveArtifact}
              disabled={isSaving}
              class="inline-flex items-center gap-2 px-6 py-2 rounded-full text-xs font-semibold bg-stone-900 text-stone-50 hover:bg-stone-800 disabled:opacity-50 transition shadow-sm cursor-pointer"
            >
              {#if isSaving}
                <svg class="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
              {:else}
                <span>Save Artifact</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <!-- Delete Confirmation Modal (<dialog>) -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <dialog
      bind:this={deleteDialogRef}
      onclick={(e) => {
        if (e.target === deleteDialogRef) closeDeleteDialog();
      }}
      class="backdrop:bg-stone-950/70 backdrop:backdrop-blur-sm bg-transparent p-4 max-w-md w-full focus:outline-none m-auto"
    >
      <div class="bg-white border border-stone-300 rounded-2xl shadow-2xl p-6 text-stone-800 space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 class="font-serif text-lg font-bold text-stone-900">Delete Case Study</h3>
            <p class="text-xs text-stone-500 font-mono">This action cannot be undone.</p>
          </div>
        </div>

        <p class="text-sm text-stone-600 leading-relaxed">
          Are you sure you want to permanently delete <strong>"{artifactToDelete?.title}"</strong>? This will remove the markdown file and clean up any associated unshared images or videos.
        </p>

        <div class="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
          <button
            type="button"
            onclick={closeDeleteDialog}
            class="px-4 py-2 rounded-full text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={confirmDeleteArtifact}
            disabled={isDeleting}
            class="px-5 py-2 rounded-full text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition shadow-sm cursor-pointer flex items-center gap-2"
          >
            {#if isDeleting}
              <span>Deleting...</span>
            {:else}
              <span>Confirm Delete</span>
            {/if}
          </button>
        </div>
      </div>
    </dialog>
  {/if}
</div>
