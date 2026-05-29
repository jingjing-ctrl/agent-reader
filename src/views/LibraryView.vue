<script setup>
import AppTopBar from '../components/AppTopBar.vue'
import LibraryBookCard from '../components/library/LibraryBookCard.vue'
import LibraryGroupSection from '../components/library/LibraryGroupSection.vue'
import LibraryBatchToolbar from '../components/library/LibraryBatchToolbar.vue'
import LibraryPagination from '../components/library/LibraryPagination.vue'
import { useLibraryPage } from '../composables/useLibraryPage'

const {
  booksStore,
  fileInput,
  scrollEl,
  error,
  activeFilter,
  currentPage,
  showGroupPanel,
  newGroupName,
  editingGroupId,
  editingGroupName,
  openGroupMenuId,
  batchMode,
  showBatchMoveMenu,
  bookCount,
  filterTabs,
  activeFilterLabel,
  filteredBooks,
  totalPages,
  pagedBooks,
  selectedCount,
  isPageFullySelected,
  isFilterFullySelected,
  batchMoveOptions,
  selectFilter,
  goToPage,
  isBookSelected,
  toggleSelectBook,
  toggleBatchMode,
  toggleSelectPage,
  toggleSelectFilter,
  batchDelete,
  batchMoveTo,
  toggleBatchMoveMenu,
  toggleGroupPanel,
  createGroup,
  startEditGroup,
  cancelEditGroup,
  saveEditGroup,
  removeGroup,
  groupOptionsForBook,
  toggleBookGroupMenu,
  assignBookGroup,
  handleCardClick,
  triggerUpload,
  onFileChange,
  removeBook,
} = useLibraryPage()
</script>

<template>
  <div class="library-app">
    <div class="library-ambient" aria-hidden="true">
      <div class="ambient-orb ambient-orb--a" />
      <div class="ambient-orb ambient-orb--b" />
      <div class="ambient-orb ambient-orb--c" />
      <div class="ambient-grid" />
    </div>

    <AppTopBar />

    <div v-if="booksStore.parsing" class="import-overlay">
      <div class="import-card">
        <div class="import-spinner" />
        <p>正在解析书籍</p>
        <span class="import-hint">请稍候，马上就好…</span>
      </div>
    </div>

    <main class="library-main">
      <header class="library-hero">
        <div class="hero-text">
          <p class="hero-eyebrow">AgentReader · 智能阅读</p>
          <div class="hero-title-row">
            <h1>我的书架</h1>
            <span v-if="bookCount" class="hero-count">{{ bookCount }} 本</span>
          </div>
          <p class="hero-desc">在 AI 陪伴下慢慢读、细细想</p>
        </div>

        <div class="hero-actions">
          <input
            ref="fileInput"
            type="file"
            accept=".epub,.pdf,application/epub+zip,application/pdf"
            hidden
            @change="onFileChange"
          />
          <button
            class="btn-group-manage"
            :class="{ active: batchMode }"
            type="button"
            @click="toggleBatchMode"
          >
            {{ batchMode ? '完成' : '批量管理' }}
          </button>
          <button class="btn-group-manage" type="button" @click="toggleGroupPanel">
            {{ showGroupPanel ? '收起分组' : '管理分组' }}
          </button>
          <button
            class="btn-import"
            type="button"
            :disabled="booksStore.parsing"
            @click="triggerUpload"
          >
            <span class="btn-import-icon" aria-hidden="true">+</span>
            {{ booksStore.parsing ? '解析中…' : '导入书籍' }}
          </button>
        </div>

        <p v-if="error" class="hero-error">{{ error }}</p>
      </header>

      <div ref="scrollEl" class="library-scroll">
        <LibraryGroupSection
          v-if="booksStore.books.length"
          :tabs="filterTabs"
          :active-filter="activeFilter"
          :show-panel="showGroupPanel"
          :groups="booksStore.groups"
          :new-group-name="newGroupName"
          :editing-group-id="editingGroupId"
          :editing-group-name="editingGroupName"
          :count-in-filter="booksStore.countBooksInFilter"
          @select-filter="selectFilter"
          @update:new-group-name="newGroupName = $event"
          @update:editing-group-name="editingGroupName = $event"
          @create-group="createGroup"
          @save-edit="saveEditGroup"
          @cancel-edit="cancelEditGroup"
          @start-edit="startEditGroup"
          @remove-group="removeGroup"
        />

        <section v-if="booksStore.books.length" class="book-shelf">
          <div v-if="!filteredBooks.length" class="filter-empty-state">
            <div class="filter-empty-card">
              <div class="filter-empty-visual" aria-hidden="true">
                <div class="filter-empty-ring" />
                <span class="filter-empty-folder">📂</span>
              </div>
              <p class="filter-empty-label">当前分组</p>
              <h3 class="filter-empty-title">
                <span class="filter-empty-name">{{ activeFilterLabel }}</span>
                下还没有书籍哦~
              </h3>
            </div>
          </div>

          <div v-else class="book-grid">
            <LibraryBatchToolbar
              v-if="batchMode"
              :selected-count="selectedCount"
              :is-page-fully-selected="isPageFullySelected"
              :is-filter-fully-selected="isFilterFullySelected"
              :move-options="batchMoveOptions"
              :menu-open="showBatchMoveMenu"
              @toggle-page="toggleSelectPage"
              @toggle-filter="toggleSelectFilter"
              @toggle-menu="toggleBatchMoveMenu"
              @move-to="batchMoveTo"
              @delete="batchDelete"
            />

            <LibraryBookCard
              v-for="book in pagedBooks"
              :key="book.id"
              :book="book"
              :batch-mode="batchMode"
              :selected="isBookSelected(book.id)"
              :group-name="book.groupId ? booksStore.getGroupName(book.groupId) : ''"
              :group-options="groupOptionsForBook(book)"
              :menu-open="openGroupMenuId === book.id"
              @click="handleCardClick(book)"
              @toggle-select="toggleSelectBook(book.id)"
              @toggle-menu="toggleBookGroupMenu($event, book.id)"
              @move-to-group="(e, gid) => assignBookGroup(e, book.id, gid)"
              @delete="removeBook($event, book)"
            />
          </div>

          <LibraryPagination
            v-if="filteredBooks.length && totalPages > 1"
            :current-page="currentPage"
            :total-pages="totalPages"
            :filter-label="activeFilterLabel"
            :book-count="filteredBooks.length"
            @prev="goToPage(currentPage - 1)"
            @next="goToPage(currentPage + 1)"
            @goto="goToPage"
          />
        </section>

        <section v-else class="empty-state">
          <div class="empty-visual" aria-hidden="true">
            <div class="empty-ring" />
            <div class="empty-books">
              <span class="empty-book empty-book--1" />
              <span class="empty-book empty-book--2" />
              <span class="empty-book empty-book--3" />
            </div>
          </div>
          <h2>书架还是空的</h2>
          <p>导入第一本书籍，让 AI 陪你一起读</p>
          <button class="btn-import btn-import--large" type="button" @click="triggerUpload">
            <span class="btn-import-icon" aria-hidden="true">+</span>
            开始导入
          </button>
        </section>
      </div>
    </main>
  </div>
</template>

<style src="../styles/library.css"></style>
