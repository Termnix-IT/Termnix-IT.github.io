# Portfolio_Web

個人ポートフォリオサイト用の静的 Web サイトです。  
Linux、Network、Python を軸にした実務経験と個人開発・検証内容を、GitHub 上で公開することを前提に整理しています。

## Overview

- ビルド不要の静的サイト構成
- `index.html` を起点に、経歴、ポートフォリオ、ツール一覧、構成図、問い合わせページで構成
- GitHub Pages および AWS S3 + CloudFront へのデプロイを想定

## Pages

- `index.html`
  - トップページ
  - 強み、注目プロジェクト、経歴、スキル、発信情報を掲載
- `portfolio.html`
  - 個人プロジェクトや構築実績の紹介
- `ToolBox.html`
  - 使用ツール、技術スタック、学習・活用技術の整理
- `Diagram.html`
  - 構成図ギャラリー
- `contact.html`
  - 問い合わせ導線

## Tech Stack

- HTML
- CSS
- JavaScript
- Bootstrap 5
- Font Awesome
- Google Fonts

## Directory Structure

```text
Portfolio_Web/
├─ index.html
├─ portfolio.html
├─ ToolBox.html
├─ Diagram.html
├─ contact.html
├─ static/
│  ├─ style.css
│  ├─ main.js
│  └─ img/
└─ .github/workflows/
```

## Local Preview

ビルドは不要です。HTML を直接開くか、簡易サーバーで確認できます。

```powershell
python -m http.server 8000
```

起動後、ブラウザで `http://localhost:8000` を開いて確認してください。

## Deployment

- GitHub Actions による自動デプロイに対応
- `master` ブランチへの push を契機にデプロイが実行される構成です
- 公開用 README では詳細なデプロイ設定や環境情報は記載していません

## Purpose

このリポジトリは、以下を一つの公開成果物として整理することを目的にしています。

- 実務での運用保守・ネットワーク対応経験
- 個人での Linux / Network / Python 検証
- GitHub 上で参照しやすい形での継続的なアウトプット

## Notes

- 公開用リポジトリのため、機密情報や業務固有情報は含めない前提です
- 実務経歴は公開可能な粒度に要約して記載しています
- デザインや掲載内容は継続的に更新する想定です

## Maintenance

- 保守運用用の手順書は `MAINTENANCE.md` を参照してください
