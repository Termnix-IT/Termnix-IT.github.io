// ============================================================
//  components/HelpSidebar.js  —  使い方ページのサイドパネル (もくじ)
// ============================================================

const HelpSidebarComponent = {
  inject: ['store'],
  template: `
    <div class="sidebar-content">
      <div class="sidebar-section-id">CONTENTS</div>

      <ul class="help-sidebar-toc">
        <li><a href="#help-tabs" @click="scrollTo('help-tabs', $event)">画面の見方</a></li>
        <li class="help-sidebar-group">タブ別ガイド</li>
        <li><a href="#help-students" @click="scrollTo('help-students', $event)"><span class="help-sidebar-glyph">◆</span> 生徒</a></li>
        <li><a href="#help-gacha"    @click="scrollTo('help-gacha', $event)"><span class="help-sidebar-glyph">◇</span> ガチャ</a></li>
        <li><a href="#help-memos"    @click="scrollTo('help-memos', $event)"><span class="help-sidebar-glyph">◈</span> 攻略メモ</a></li>
        <li><a href="#help-teams"    @click="scrollTo('help-teams', $event)"><span class="help-sidebar-glyph">▤</span> 編成</a></li>
        <li><a href="#help-materials" @click="scrollTo('help-materials', $event)"><span class="help-sidebar-glyph">▦</span> 素材</a></li>
        <li class="help-sidebar-group">バックアップ</li>
        <li><a href="#help-export" @click="scrollTo('help-export', $event)">エクスポート / インポート</a></li>
        <li class="help-sidebar-group">その他</li>
        <li><a href="#help-tips" @click="scrollTo('help-tips', $event)">コツ・注意点</a></li>
      </ul>
    </div>
  `,
  methods: {
    scrollTo(id, ev) {
      ev.preventDefault();
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  },
};
