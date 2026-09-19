// ============================================================
//  components/HelpGuide.js  —  使い方ガイド (非エンジニア向け)
//  ナビバー「使い方」タブで表示される。
// ============================================================

const HelpGuideComponent = {
  inject: ['store'],
  template: `
    <div class="help-guide">

      <!-- ヘッダー -->
      <div class="os-panel help-hero">
        <div class="os-section-id">// HELP / GUIDE</div>
        <h2 class="help-hero-title">SCHALE.OS の使い方</h2>
        <p class="help-hero-lead">
          このアプリは、ブルーアーカイブのプレイ記録を <strong>あなたのブラウザだけ</strong> に保存する
          個人用ツールです。<br>
          サーバーには何も送られません。インターネット接続は最初の読み込みだけ必要です。
        </p>
      </div>

      <!-- ── 画面構成 ── -->
      <div id="help-tabs" class="os-panel help-section">
        <div class="os-section-id">// SCREEN_LAYOUT</div>
        <h3>画面の見方</h3>
        <p>画面は3つの場所に分かれています。</p>
        <ul class="help-list">
          <li><strong>上のバー(ナビ)</strong> ─ <em>画面を切り替える</em>場所。「生徒」「ガチャ」などのボタンが並んでいます。</li>
          <li><strong>左のサイドパネル</strong> ─ <em>絞り込みや並び替え</em>をする場所。タブごとに中身が変わります。<br>
            上の <span class="help-kbd">≡</span> ボタンで開閉できます。</li>
          <li><strong>真ん中のメインエリア</strong> ─ いま選んでいるタブの<em>中身が表示される</em>場所。</li>
        </ul>
      </div>

      <!-- ── 生徒 ── -->
      <div id="help-students" class="os-panel help-section">
        <div class="os-section-id">// TAB / STUDENTS</div>
        <h3><span class="help-glyph">◆</span> 生徒</h3>
        <p>所持している生徒の管理と、育成状況の記録ができます。</p>
        <ul class="help-list">
          <li><strong>所持の切り替え</strong> ─ カード左上の <span class="help-kbd">○</span>/<span class="help-kbd">●</span> をクリック。所持生徒には青い枠が付きます。</li>
          <li><strong>詳細の編集</strong> ─ カード本体をクリックすると、絆Lv・星ランク・スキルレベル・装備・固有武器・能力開放・必要素材などをまとめて編集できます。</li>
          <li><strong>絞り込み・並び替え</strong> ─ 左のサイドパネルから、学校・役割・レアリティ・攻撃タイプ・所持状況などで絞り込めます。</li>
          <li><strong>入手区分バッジ</strong> ─ カードの名前の右に <span class="help-kbd">恒常</span> / <span class="help-kbd">限定</span> / <span class="help-kbd">配布</span> が表示されます。攻撃タイプバッジも同じ位置に並びます。</li>
          <li><strong>所持チェッカー</strong> ─ サイドパネル上部のトグルから切り替え。学校別の所持率を一覧で確認できます。<strong>学校名をクリックすると、その学校の生徒リストを折りたたんだり展開したりできます</strong>(▶/▼アイコン)。</li>
          <li><strong>画像のアップロード</strong> ─ 詳細画面で生徒の画像を差し替えできます(自動でリサイズされます)。</li>
        </ul>
      </div>

      <!-- ── ガチャ ── -->
      <div id="help-gacha" class="os-panel help-section">
        <div class="os-section-id">// TAB / GACHA</div>
        <h3><span class="help-glyph">◇</span> ガチャ</h3>
        <p>ガチャを <em>体験的にシミュレーション</em> できます(実際のゲームのガチャを引くわけではありません)。</p>
        <ul class="help-list">
          <li><strong>10連 / 単発</strong> ─ ボタンで引けます。10連目には★2以上が必ず1人出ます。</li>
          <li><strong>募集モード</strong> ─ サイドパネルから切替。
            <ul>
              <li><strong>ピックアップ募集</strong> ─ PU★3=0.7%(★3合計=3%)。「呼び出しチャージ」</li>
              <li><strong>期間限定ピックアップ</strong> ─ 限定生徒のPU。確率は同じで「限定・呼び出しチャージ」</li>
              <li><strong>周年限定募集</strong> ─ アニバ仕様(★3合計=6%)。「限定・呼び出しチャージ」</li>
              <li><strong>アーカイブ募集</strong> ─ 従来どおり200ptで呼び出し(交換)</li>
            </ul>
          </li>
          <li><strong>呼び出しチャージ(2026/7/29の新天井)</strong> ─ 引くたびに1ずつ貯まり、<em>100に達した募集で★3確定・50%でPU</em>、<em>200に達した募集でPU確定</em>。PUを引くとその時点で0に戻ります(すり抜けでは戻りません)。募集期間をまたいでも持ち越されるので、このアプリでもブラウザに保存され、次回起動時も続きから使えます。サイドパネルの「CHARGE」でゲーム内の現在値を入力できます。</li>
          <li><strong>PU生徒</strong> ─ サイドパネルの「PU生徒を選択」で対象を指定してから引きます(未指定だとボタンが押せません)。</li>
          <li><strong>排出される生徒</strong> ─ すり抜け・★2・★1 は<em>恒常生徒のみ</em>。<em>限定生徒はPUに選んだときだけ</em>出ます。<em>配布生徒はガチャからは出ません</em>(PUの選択肢にも出てきません)。</li>
          <li><strong>排出枠の内訳</strong> ─ サイドパネル下部に各枠の確率が表示されます。</li>
          <li>結果はメインエリアに表示されます。あくまで体験用なので、引いた結果で所持状態は変わりません。</li>
        </ul>
      </div>

      <!-- ── 攻略メモ ── -->
      <div id="help-memos" class="os-panel help-section">
        <div class="os-section-id">// TAB / MEMOS</div>
        <h3><span class="help-glyph">◈</span> 攻略メモ</h3>
        <p>総力戦・大決戦・イベントなどの攻略メモを <strong>Markdown</strong> で書き溜められます。</p>
        <ul class="help-list">
          <li><strong>新規作成</strong> ─ サイドパネルの「新規」ボタン。</li>
          <li><strong>編集 / プレビュー</strong> ─ エディタは「分割表示」「編集のみ」「プレビューのみ」の3モードを切り替えできます。</li>
          <li><strong>カテゴリ分類</strong> ─ 総力戦・大決戦・ホードレイド・イベント・その他から選択。</li>
          <li><strong>検索</strong> ─ サイドパネル上部の検索ボックスでタイトル/本文を検索できます。</li>
        </ul>
        <div class="help-callout">
          <strong>Markdown とは?</strong>
          <code>**強調**</code> や <code># 見出し</code> など、簡単な記号で文字を装飾できる書き方です。書き方を覚えなくても、ふつうの文章として保存するだけで動きます。
        </div>
      </div>

      <!-- ── 編成 ── -->
      <div id="help-teams" class="os-panel help-section">
        <div class="os-section-id">// TAB / TEAMS</div>
        <h3><span class="help-glyph">▤</span> 編成</h3>
        <p>パーティ(編成)を保存しておけます。攻略メモから参照する用途を想定しています。</p>
        <ul class="help-list">
          <li><strong>通常編成</strong> ─ ストライカー4 / スペシャル2(通常のレギュレーション)</li>
          <li><strong>制約解除決戦</strong> ─ ストライカー6 / スペシャル4(大決戦などの拡張ルール)</li>
          <li><strong>用途タグ</strong> ─ 総力戦・大決戦・合同火力演習・カフェテリア・その他から選んで分類できます。</li>
          <li>サイドパネルで <em>モード</em> と <em>用途タグ</em> による絞り込みができます。</li>
        </ul>
      </div>

      <!-- ── 素材 ── -->
      <div id="help-materials" class="os-panel help-section">
        <div class="os-section-id">// TAB / MATERIALS</div>
        <h3><span class="help-glyph">▦</span> 素材</h3>
        <p>ゲームに実装されている育成素材(レポート・強化珠・戦術教育BD・技術ノート・オーパーツ・装備設計図など 276 種)があらかじめ並んでいるので、<strong>ゲーム内の所持数を入力するだけ</strong>で管理できます。</p>
        <ul class="help-list">
          <li><strong>所持数の入力</strong> ─ サイドパネルで「所持数の入力」を選ぶと、学校・系統・部位ごとの表が出ます。数値を入れて Enter を押すか別の欄に移ると自動で保存されます(0 や空欄は未所持)。</li>
          <li><strong>一括確認</strong> ─ 「一括確認」を選ぶと、持っている種類の数・合計個数・レポートや強化珠を EXP に換算した値と、全素材の所持状況を表でまとめて見られます。行ごと・段階ごとの合計も出ます。</li>
          <li><strong>絞り込み</strong> ─ カテゴリの選択や、「ゲヘナ」「ネブラ」「設計図」のような文字で表を絞り込めます。一括確認では「所持している素材だけ表示」も使えます。</li>
          <li><strong>必要素材の過不足</strong> ─ 各生徒の詳細画面で「必要素材」を登録すると、一括確認の下部で所持数との過不足を確認できます。</li>
          <li><strong>以前のデータ</strong> ─ 以前のバージョンで名前を入力して登録した素材は、名前が一致するものだけ自動で引き継がれます。一致しなかったものは「以前に手入力した素材」に残るので、入力し直してから削除してください。</li>
        </ul>
      </div>

      <!-- ── エクスポート / インポート ── -->
      <div id="help-export" class="os-panel help-section help-export">
        <div class="os-section-id">// EXPORT / IMPORT</div>
        <h3>エクスポート・インポートとは?</h3>

        <div class="help-callout help-callout--warn">
          <strong>大事なポイント:</strong>
          このアプリのデータは <strong>あなたが今使っているブラウザの中</strong> にだけ保存されています。<br>
          つまり、<strong>別のパソコンや別のブラウザでは開けません</strong>。また、ブラウザの履歴やサイトデータを消すと <strong>データも消えます</strong>。<br>
          そのため <strong>定期的にエクスポート(バックアップ)を取ることを強くおすすめします</strong>。
        </div>

        <h4>エクスポート(書き出し)</h4>
        <p>画面右上の <span class="help-kbd">エクスポート</span> ボタンを押すと、すべての記録が <strong>1つの JSON ファイル</strong>(ファイル名: <code>blueArchive_backup_2026-05-07.json</code> のような形式)としてダウンロードされます。</p>
        <ul class="help-list">
          <li>含まれるデータ: <strong>生徒の育成データ・アップロードした生徒画像・ガチャ履歴・攻略メモ・編成・素材在庫</strong>(これだけ持っておけば全部戻ります)</li>
          <li>このファイルを <strong>クラウドストレージ</strong>(Google ドライブ、OneDrive 等)や <strong>USB メモリ</strong> に保管しておけば、いつでも元の状態に戻せます。</li>
          <li>生徒画像をたくさんアップロードしているとファイルサイズが大きくなることがあります(画像 1 枚あたり数十KB)。</li>
        </ul>

        <h4>インポート(読み込み)</h4>
        <p>画面右上の <span class="help-kbd">インポート</span> ボタンを押して、エクスポートしておいた JSON ファイルを選びます。
        ファイルを選ぶと、次の確認ダイアログが出ます。</p>

        <div class="help-mode-compare">
          <div class="help-mode-card">
            <div class="help-mode-title help-mode-title--replace">【OK】 置き換え</div>
            <p><strong>今のデータをすべて消してから</strong>、ファイルの内容で上書きします。</p>
            <p class="help-mode-when">こんなときに: 別の PC で取ったバックアップを<strong>そのまま復元したい</strong>。今のデータは要らない。</p>
          </div>
          <div class="help-mode-card">
            <div class="help-mode-title help-mode-title--merge">【キャンセル】 マージ</div>
            <p><strong>今のデータを残したまま</strong>、ファイルの内容を<strong>追加</strong>します。</p>
            <p class="help-mode-when">こんなときに: 2台の PC で取ったメモを<strong>1つにまとめたい</strong>。重複は気にしない。</p>
          </div>
        </div>

        <div class="help-callout">
          <strong>迷ったら「置き換え」</strong>がおすすめです。マージは同じデータが二重に入ることがあります。<br>
          念のため、インポートの<strong>前</strong>に一度エクスポートしておくと安全です(失敗しても元に戻せます)。
        </div>

        <h4>インポート後の確認方法</h4>
        <p>インポートに成功すると、画面右下に <strong>取り込んだ件数</strong> がトースト表示されます。例:</p>
        <p style="font-family:monospace;font-size:11.5px;background:#f6faff;padding:8px 12px;border-left:3px solid #10b981;color:#0d1b2a;">
          インポート完了 (置き換え): 生徒 28 人 / 編成 5 件 / メモ 12 件
        </p>
        <p>件数が表示されたら成功です。各タブを開いて中身を確認してください。</p>
        <ul class="help-list">
          <li><strong>「◆ 生徒」タブ</strong> ─ 所持(青枠)の付いた生徒が復元されます。詳細を開くと絆Lv・装備・スキル等も入っています。</li>
          <li><strong>「▤ 編成」タブ</strong> ─ 保存していたパーティが一覧に並びます。</li>
          <li><strong>「◈ 攻略メモ」タブ</strong> ─ 書き溜めたメモが復元されます。</li>
          <li><strong>「▦ 素材」タブ</strong> ─ 素材在庫の数値が戻ります。</li>
          <li><strong>「◇ ガチャ」タブ</strong> ─ 過去のシミュレーション履歴が残っていれば復元されます(なくても問題ありません)。</li>
        </ul>
        <div class="help-callout">
          <strong>表示されないタブがあっても問題ありません。</strong> もとのバックアップに含まれていなかった項目は 0 件のままになります(例: 編成を一度も作っていなければ「編成」は空)。
        </div>

        <h4>よくある質問</h4>
        <dl class="help-faq">
          <dt>Q. 別の PC で続きを使いたい</dt>
          <dd>A. 今の PC で「エクスポート」→ ファイルを別 PC に移す → 別 PC で「インポート(置き換え)」。</dd>

          <dt>Q. ブラウザを変えたらデータが消えた</dt>
          <dd>A. データはブラウザごとに別管理されます。エクスポートしたバックアップから「インポート(置き換え)」で復元してください。</dd>

          <dt>Q. シークレットモード(プライベートウィンドウ)で開いたら毎回消える</dt>
          <dd>A. シークレットモードはブラウザ仕様でデータが残りません。普通のウィンドウで使ってください。</dd>

          <dt>Q. iPhone / Android のブラウザでも使える?</dt>
          <dd>A. 動作はしますが、スマホブラウザはサイトデータを自動削除する場合があります。こまめなエクスポートを推奨します。</dd>
        </dl>
      </div>

      <!-- ── コツ・注意点 ── -->
      <div id="help-tips" class="os-panel help-section">
        <div class="os-section-id">// TIPS</div>
        <h3>ちょっとしたコツ・注意点</h3>
        <ul class="help-list">
          <li><strong>サイドパネルが邪魔な時</strong> ─ 左上の <span class="help-kbd">≡</span> で折りたたみできます。</li>
          <li><strong>キャッシュ削除はデータ削除</strong> ─ ブラウザ設定で「サイトデータを削除」するとアプリ内の記録も消えます。実行前にエクスポートを。</li>
          <li><strong>定期バックアップ</strong> ─ 大きな育成イベント前後や、ブラウザのアップデート前にエクスポートしておくと安心です。</li>
          <li><strong>データはサーバーに送られません</strong> ─ 本アプリはオフラインで動くため、入力した情報がインターネット上に流れることはありません。</li>
        </ul>
      </div>

    </div>
  `,
};
