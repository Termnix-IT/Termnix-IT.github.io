# Portfolio_Web

Termnix-IT の個人ポートフォリオサイト（静的 Web サイト）。
Linux・Network・Python を軸にした実務経験と個人プロジェクトを、
「Infrastructure Career Document」風のレイアウトで整理して公開しています。

## Overview

- ビルド不要の静的サイト（HTML / CSS / JavaScript）
- 全ページ共通の Career Document Layout（左サイドパネル＋右メイン2カラム）
- 濃紺＋シアン＋グリーンを基調とした技術ドキュメント風デザイン
- レスポンシブ対応（PC / タブレット / モバイル）
- GitHub Pages および AWS S3 + CloudFront へのデプロイを想定

## Pages

| ファイル | 役割 |
|---|---|
| `index.html` | Career Profile：Overview / Career Timeline / Skills / Certifications / Projects / Publishing |
| `portfolio.html` | 個人プロジェクトの詳細（自宅サーバ公開、Zabbix 監視導入など） |
| `ToolBox.html` | 自作ツール・スクリプト一覧 |
| `Diagram.html` | システム構成図ギャラリー |
| `contact.html` | 連絡チャンネル（Qiita / GitHub） |

各ページは共通のサイドパネル（Profile / Current Status / Links / Sections）と、
ページ固有の本文セクション（A, B, C... の連番バッジ付き）で構成されています。

## Tech Stack

- HTML / CSS / JavaScript（バニラ、フレームワーク不使用）
- Bootstrap 5（グリッド・ナビゲーション折りたたみのみ利用）
- Font Awesome 6（アイコン）
- Google Fonts（Zen Kaku Gothic New / Space Mono）

## Directory Structure

```text
Portfolio_Web/
├─ index.html
├─ portfolio.html
├─ ToolBox.html
├─ Diagram.html
├─ contact.html
├─ static/
│  ├─ style.css        # 共通スタイル + Career Document Layout（.cdoc-*）
│  ├─ main.js          # ナビアクティブ表示、Qiita 記事取得
│  └─ img/
│     ├─ main-icon.png
│     └─ server-diagram.png
├─ .github/workflows/  # GitHub Actions による自動デプロイ
└─ README.md
```

## Local Preview

ビルドは不要です。HTML を直接開くか、簡易サーバーで確認できます。

```powershell
python -m http.server 8000
```

起動後、ブラウザで `http://localhost:8000` を開いて確認してください。

## Design System

新ページ群（`body.cdoc-page` クラスを持つページ）では `static/style.css` 末尾の
「Career Document Layout」ブロックで定義された `.cdoc-*` クラスを使用しています。
配色・余白・タイポグラフィは CSS カスタムプロパティで一元管理（`--primary-dark`、
`--accent`、`--cdoc-green` など）。新規セクションを追加する場合は既存の
`.cdoc-section` パターンに従ってください。

## Deployment

- `master` ブランチへの push を契機に GitHub Actions が起動
- GitHub Pages と AWS S3 + CloudFront に同時にデプロイ

## Purpose

このリポジトリは、以下を一つの公開成果物として整理することを目的にしています。

- 実務での運用保守・ネットワーク対応経験
- 個人での Linux / Network / Python 検証
- Qiita / GitHub と連動した継続的なアウトプット

## Notes

- 公開用リポジトリのため、機密情報・業務固有情報は含めない方針
- 実務経歴は公開可能な粒度に要約
- デザイン・掲載内容は継続的に更新
