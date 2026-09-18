#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bluearchive.wikiru.jp「キャラクター一覧」→ data/students.master.csv 取り込みスクリプト

Usage:
    python scripts/import-wiki-students.py                 # wiki を取得して CSV を更新し、差分を表示
    python scripts/import-wiki-students.py --dry-run       # 差分表示のみ (CSV は書き換えない)
    python scripts/import-wiki-students.py --build         # CSV 更新後に build-students.py も実行
    python scripts/import-wiki-students.py --drop-missing  # wiki に存在しない既存行を削除する
    python scripts/import-wiki-students.py --html page.html  # 保存済み HTML から取り込む (オフライン用)

動作:
- wiki の一覧テーブル (全生徒・全衣装違い) を取得し、本プロジェクトの CSV 形式へ変換する
- 既存 CSV の id / imageUrl は name をキーに引き継ぐ
  (id は localStorage の育成データのキーなので、再取り込みで変わらないようにする)
- wiki に存在しない既存行は既定では残して警告する (--drop-missing で削除)
- 学校 → ベース名の 50 音順 → 本体 → 衣装違い (★降順・名前昇順) の順に並べ、学校間を空行で区切る
- 学校の並び順は data/constants.js の SCHOOLS から読む。未掲載の学校は末尾に並ぶ (SCHOOLS へ追記推奨)

注意:
- この wiki は国外 IP からのアクセスを拒否する。国内ネットワークから実行すること
- 新しい生徒名 (ローマ字未登録) や衣装名が現れるとエラーで停止する
  → BASE_ROMAJI / VARIANT_ROMAJI に追記して再実行する
- 取り込み後は必ず `python scripts/build-students.py` を実行して JSON を再生成する (--build で自動実行)

変換ルール:
- 武器:     wiki 'SR' → 'SL'。それ以外は同名 (HG/AR/SG/SMG/MG/GL/RL/FT/MT/RG)
- 入手区分: 募集 ○(通常)/●(アーカイブ) → permanent
            ◇(期間限定)/☆(周年)/★(リコレクト)/▽(コラボ) → limited
            -(ガチャ排出なし: 任務 Hard・イベント配布等) → event
- 攻撃:     爆発/貫通/神秘/振動 → explosive/piercing/mystic/sonic
- 装甲:     軽装備/重装甲/特殊装甲/弾力装甲/複合装甲 → light/heavy/special/elastic/compositearmor
- 同名が複数行ある場合 (ホシノ（臨戦）の 2 形態など) は最初の行を採用する
"""

import argparse
import collections
import csv
import io
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

# Windows コンソール (cp932) でも UTF-8 で出力できるよう再設定
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

ROOT           = Path(__file__).resolve().parent.parent
CSV_PATH       = ROOT / 'data' / 'students.master.csv'
CONSTANTS_PATH = ROOT / 'data' / 'constants.js'
BUILD_SCRIPT   = ROOT / 'scripts' / 'build-students.py'

WIKI_URL  = 'https://bluearchive.wikiru.jp/?' + urllib.parse.quote('キャラクター一覧')
USER_AGENT = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
              '(KHTML, like Gecko) Chrome/128.0 Safari/537.36')

HEADER = ['id', 'name', 'school', 'class', 'rarity', 'attackType', 'armorType',
          'role', 'position', 'weapon', 'obtainability', 'imageUrl']

# ─────────────────────────────────────────────────────────────
#  wiki 表記 → CSV 値 の対応表
# ─────────────────────────────────────────────────────────────
ATTACK_MAP = {'爆発': 'explosive', '貫通': 'piercing', '神秘': 'mystic', '振動': 'sonic'}
ARMOR_MAP  = {'軽装備': 'light', '重装甲': 'heavy', '特殊装甲': 'special',
              '弾力装甲': 'elastic', '複合装甲': 'compositearmor'}
WEAPON_MAP = {'SR': 'SL'}   # それ以外は同名
KNOWN_WEAPONS = {'HG', 'AR', 'SG', 'SMG', 'SL', 'MG', 'GL', 'RL', 'FT', 'MT', 'RG'}
CLASSES   = {'アタッカー', 'タンク', 'ヒーラー', 'サポーター', 'T.S'}
ROLES     = {'STRIKER': 'striker', 'SPECIAL': 'special'}
POSITIONS = {'FRONT', 'MIDDLE', 'BACK'}
RECRUIT_MAP = {
    '○': 'permanent', '●': 'permanent',
    '◇': 'limited', '☆': 'limited', '★': 'limited', '▽': 'limited',
    '-': 'event',
}

# ベース名 (衣装違いを除いた名前) → ローマ字 id
BASE_ROMAJI = {
 'アイリ':'airi','アオバ':'aoba','アカネ':'akane','アカリ':'akari','アコ':'ako','アズサ':'azusa','アスナ':'asuna','アツコ':'atsuko','アヤネ':'ayane','アリス':'arisu','アル':'aru',
 'イオリ':'iori','イズナ':'izuna','イズミ':'izumi','イチカ':'ichika','イブキ':'ibuki','イロハ':'iroha',
 'ウイ':'ui','ウタハ':'utaha','ウミカ':'umika','エイミ':'eimi','エリ':'eri','エリカ':'erika','オトギ':'otogi',
 'カエデ':'kaede','カズサ':'kazusa','カスミ':'kasumi','カノエ':'kanoe','カホ':'kaho','カヨコ':'kayoko','カリン':'karin','カンナ':'kanna',
 'キキョウ':'kikyou','キサキ':'kisaki','キララ':'kirara','キリノ':'kirino','クルミ':'kurumi','ケイ':'kei',
 'ココナ':'kokona','ココロ':'kokoro','コタマ':'kotama','コトネ':'kotone','コトリ':'kotori','コノカ':'konoka','コハル':'koharu','コユキ':'koyuki',
 'サオリ':'saori','サキ':'saki','サクラコ':'sakurako','サツキ':'satsuki','サヤ':'saya',
 'シグレ':'shigure','シズコ':'shizuko','シミコ':'shimiko','ジュリ':'juri','ジュンコ':'junko','シュン':'shun','シロコ':'shiroko',
 'スズミ':'suzumi','スバル':'subaru','スミレ':'sumire','セイア':'seia','セナ':'sena','セリカ':'serika','セリナ':'serina',
 'タカネ':'takane','チアキ':'chiaki','チェリノ':'cherino','チセ':'chise','チナツ':'chinatsu','チヒロ':'chihiro',
 'ツクヨ':'tsukuyo','ツバキ':'tsubaki','ツルギ':'tsurugi','トキ':'toki','トモエ':'tomoe',
 'ナギサ':'nagisa','ナグサ':'nagusa','ナツ':'natsu','ニコ':'niko','ニヤ':'niya','ネル':'neru',
 'ノア':'noa','ノゾミ':'nozomi','ノドカ':'nodoka','ノノミ':'nonomi',
 'ハスミ':'hasumi','ハナエ':'hanae','ハナコ':'hanako','ハルカ':'haruka','ハルナ':'haruna','ハレ':'hare',
 'ヒカリ':'hikari','ヒナ':'hina','ヒナタ':'hinata','ヒビキ':'hibiki','ヒフミ':'hifumi','ヒマリ':'himari','ヒヨリ':'hiyori',
 'フィーナ':'fina','フウカ':'fuuka','フブキ':'fubuki','フユ':'fuyu','ホシノ':'hoshino',
 'マキ':'maki','マコト':'makoto','マシロ':'mashiro','マリー':'marie','マリナ':'marina',
 'ミカ':'mika','ミサキ':'misaki','ミチル':'michiru','ミドリ':'midori','ミナ':'mina','ミネ':'mine','ミノリ':'minori','ミモリ':'mimori','ミヤコ':'miyako','ミユ':'miyu','ミヨ':'miyo',
 'ムツキ':'mutsuki','メグ':'megu','メル':'meru','モエ':'moe','モミジ':'momiji','モモイ':'momoi',
 'ヤクモ':'yakumo','ユウカ':'yuuka','ユカリ':'yukari','ユズ':'yuzu','ヨシミ':'yoshimi','ラブ':'love',
 'リオ':'rio','リツ':'ritsu','ルミ':'rumi','レイ':'rei','レイサ':'reisa','レイジョ':'reijo','レナ':'rena','レンゲ':'renge','ワカモ':'wakamo',
 '御坂美琴':'misaka-mikoto','食蜂操祈':'shokuhou-misaki','佐天涙子':'saten-ruiko','初音ミク':'hatsune-miku',
}

# 衣装名 (全角括弧内 / ＊以降) → id サフィックス
VARIANT_ROMAJI = {
 '水着':'mizugi','正月':'shougatsu','ドレス':'dress','制服':'seifuku','バニーガール':'bunny','メイド':'maid',
 '臨戦':'rinsen','応援団':'ouendan','温泉':'onsen','体操服':'taisoufuku','私服':'shifuku','パジャマ':'pajama',
 'キャンプ':'camp','アルバイト':'arubaito','アイドル':'idol','クリスマス':'christmas','バンド':'band',
 'マジカル':'magical','ガイド':'guide','チーパオ':'qipao','幼女':'youjo','ライディング':'riding','テラー':'terror',
}

NAME_RE = re.compile(r'^(.+?)(?:（(.+)）|＊(.+))?$')


# ─────────────────────────────────────────────────────────────
#  取得 / パース
# ─────────────────────────────────────────────────────────────
def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept-Language': 'ja,en;q=0.8'})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read().decode('utf-8', errors='replace')


class TableParser(HTMLParser):
    """全 <tr> をセル文字列のリストとして収集する (名前セル内の <br> は無視して結合)"""
    def __init__(self):
        super().__init__()
        self.rows = []
        self._row = None
        self._cell = None

    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self._row = []
        elif tag in ('td', 'th') and self._row is not None:
            self._cell = []

    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self._cell is not None:
            self._row.append(''.join(self._cell).strip())
            self._cell = None
        elif tag == 'tr' and self._row is not None:
            self.rows.append(self._row)
            self._row = None

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data.replace('\n', '').replace('\r', ''))


def parse_students(html: str):
    """一覧テーブルの生徒行 (先頭セルが ★3/★2/★1) を dict のリストにする。
    列: レア, 画像, 名前, 武器, 遮蔽, 役割, ポジション, クラス, 学校, 攻撃, 防御,
        市街, 屋外, 屋内, 射程, 装備1, 装備2, 装備3, 募集, 入手, 編集
    """
    p = TableParser()
    p.feed(html)
    out = []
    for r in p.rows:
        if not r or r[0] not in ('★3', '★2', '★1'):
            continue
        if len(r) < 20:
            print(f'  ! 列数不足の行をスキップ: {r}', file=sys.stderr)
            continue
        out.append({
            'rarity':   r[0][1],
            'name':     r[2].replace(' ', '').replace('　', ''),
            'weapon':   r[3],
            'role':     r[5],
            'position': r[6],
            'class':    r[7],
            'school':   r[8],
            'attack':   r[9],
            'armor':    r[10],
            'recruit':  r[-3],
        })
    return out


# ─────────────────────────────────────────────────────────────
#  変換
# ─────────────────────────────────────────────────────────────
def split_name(name: str):
    m = NAME_RE.match(name)
    return m.group(1), (m.group(2) or m.group(3) or '')


def make_id(name: str) -> str:
    base, var = split_name(name)
    if base not in BASE_ROMAJI:
        raise KeyError(f'BASE_ROMAJI 未登録: {base!r} ({name}) → スクリプトの対応表に追記してください')
    if var and var not in VARIANT_ROMAJI:
        raise KeyError(f'VARIANT_ROMAJI 未登録: {var!r} ({name}) → スクリプトの対応表に追記してください')
    return BASE_ROMAJI[base] + (f'-{VARIANT_ROMAJI[var]}' if var else '')


def convert(w: dict, existing: dict | None) -> dict:
    """wiki 行 1 件を CSV レコードへ。existing (同名の既存行) があれば id / imageUrl を引き継ぐ"""
    errs = []
    if w['class'] not in CLASSES:      errs.append(f"class {w['class']!r}")
    if w['attack'] not in ATTACK_MAP:  errs.append(f"攻撃 {w['attack']!r}")
    if w['armor'] not in ARMOR_MAP:    errs.append(f"防御 {w['armor']!r}")
    if w['role'] not in ROLES:         errs.append(f"役割 {w['role']!r}")
    if w['position'] not in POSITIONS: errs.append(f"ポジション {w['position']!r}")
    if w['recruit'] not in RECRUIT_MAP: errs.append(f"募集 {w['recruit']!r}")
    weapon = WEAPON_MAP.get(w['weapon'], w['weapon'])
    if weapon not in KNOWN_WEAPONS:    errs.append(f"武器 {w['weapon']!r}")
    if errs:
        raise ValueError(f"{w['name']}: 未知の値 {', '.join(errs)} → 対応表 / constants.js / build-students.py を更新してください")

    gen_id = make_id(w['name'])
    if existing and existing['id'] != gen_id:
        print(f"  NOTE 既存 id を優先: {w['name']} existing={existing['id']} generated={gen_id}")
    return {
        'id':            existing['id'] if existing else gen_id,
        'name':          w['name'],
        'school':        w['school'],
        'class':         w['class'],
        'rarity':        w['rarity'],
        'attackType':    ATTACK_MAP[w['attack']],
        'armorType':     ARMOR_MAP[w['armor']],
        'role':          ROLES[w['role']],
        'position':      w['position'],
        'weapon':        weapon,
        'obtainability': RECRUIT_MAP[w['recruit']],
        'imageUrl':      (existing or {}).get('imageUrl', '') or '',
    }


def load_school_order():
    """data/constants.js の SCHOOLS 配列から並び順を読む"""
    src = CONSTANTS_PATH.read_text(encoding='utf-8')
    m = re.search(r'const\s+SCHOOLS\s*=\s*\[(.*?)\];', src, re.S)
    if not m:
        print('  ! constants.js から SCHOOLS を読めませんでした。学校は名前順に並べます', file=sys.stderr)
        return []
    return re.findall(r'"([^"]+)"', m.group(1))


def group_by_school(records, school_order):
    """学校 → ベース名 50 音 → 本体 → 衣装違い(★降順・名前昇順) に並べたブロックの配列を返す"""
    by_school = collections.defaultdict(list)
    for r in records:
        by_school[r['school']].append(r)
    unknown = sorted(s for s in by_school if s not in school_order)
    if unknown:
        print(f'  ! SCHOOLS 未掲載の学校 (末尾に配置): {unknown} → data/constants.js の SCHOOLS / SCHOOL_COLORS へ追記を推奨')
    blocks = []
    for school in [s for s in school_order if s in by_school] + unknown:
        groups = collections.defaultdict(list)
        for r in by_school[school]:
            groups[split_name(r['name'])[0]].append(r)
        ordered = []
        for base in sorted(groups):
            g = groups[base]
            main  = [r for r in g if not split_name(r['name'])[1]]
            vars_ = sorted((r for r in g if split_name(r['name'])[1]),
                           key=lambda r: (-int(r['rarity']), r['name']))
            ordered += main + vars_
        blocks.append((school, ordered))
    return blocks


# ─────────────────────────────────────────────────────────────
#  CSV 入出力
# ─────────────────────────────────────────────────────────────
def load_existing_csv():
    if not CSV_PATH.exists():
        return [], False, '\n'
    raw = CSV_PATH.read_bytes()
    bom = raw.startswith(b'\xef\xbb\xbf')
    text = raw.decode('utf-8-sig')
    eol = '\r\n' if '\r\n' in text else '\n'
    rows = [r for r in csv.DictReader(io.StringIO(text)) if any((v or '').strip() for v in r.values())]
    return rows, bom, eol


def render_csv(blocks, eol: str) -> str:
    def lines(rows):
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=HEADER, lineterminator=eol)
        for r in rows:
            w.writerow(r)
        return buf.getvalue()
    return ','.join(HEADER) + eol + eol.join(lines(rows) for _, rows in blocks)


# ─────────────────────────────────────────────────────────────
#  main
# ─────────────────────────────────────────────────────────────
def main() -> int:
    ap = argparse.ArgumentParser(description='wiki の生徒一覧を data/students.master.csv へ取り込む')
    ap.add_argument('--dry-run', action='store_true', help='差分を表示するだけで CSV を書き換えない')
    ap.add_argument('--build', action='store_true', help='CSV 更新後に scripts/build-students.py を実行する')
    ap.add_argument('--drop-missing', action='store_true', help='wiki に存在しない既存行を削除する (既定は残して警告)')
    ap.add_argument('--html', type=Path, default=None, help='保存済み HTML ファイルから取り込む (wiki へアクセスしない)')
    a = ap.parse_args()

    # 1. 取得
    try:
        if a.html:
            html = a.html.read_text(encoding='utf-8', errors='replace')
            print(f'✓ 読込: {a.html}')
        else:
            html = fetch_html(WIKI_URL)
            print(f'✓ 取得: {WIKI_URL} ({len(html):,} bytes)')
    except Exception as e:
        print(f'✗ 取得失敗: {e}', file=sys.stderr)
        return 1
    if 'Runtime error' in html[:5000] or '国外のIP' in html:
        print('✗ wiki がアクセスを拒否しました (国外 IP / ホスト制限)。国内ネットワークから再実行してください', file=sys.stderr)
        return 1

    wiki_rows = parse_students(html)
    if not wiki_rows:
        print('✗ 生徒行が見つかりません。ページ構成が変わった可能性があります', file=sys.stderr)
        return 1
    # 同名重複 (ホシノ（臨戦）の 2 形態 等) は最初の行を採用
    seen, uniq = set(), []
    for w in wiki_rows:
        if w['name'] in seen:
            continue
        seen.add(w['name']); uniq.append(w)
    print(f'✓ 解析: {len(wiki_rows)} 行 / {len(uniq)} 人')

    # 2. 変換 (既存 id / imageUrl 引き継ぎ)
    existing, bom, eol = load_existing_csv()
    ex_by_name = {r['name']: r for r in existing}
    try:
        records = [convert(w, ex_by_name.get(w['name'])) for w in uniq]
    except (KeyError, ValueError) as e:
        print(f'✗ 変換失敗: {e}', file=sys.stderr)
        return 2

    wiki_names = {r['name'] for r in records}
    missing = [r for r in existing if r['name'] not in wiki_names]
    if missing:
        names = ', '.join(f"{r['name']}({r['id']})" for r in missing)
        if a.drop_missing:
            print(f'  - wiki に存在しない既存行を削除: {names}')
        else:
            print(f'  ! wiki に存在しない既存行を保持 (削除するには --drop-missing): {names}')
            records += [{k: r.get(k, '') or '' for k in HEADER} for r in missing]

    dup = [i for i, c in collections.Counter(r['id'] for r in records).items() if c > 1]
    if dup:
        print(f'✗ id が重複しています: {dup}', file=sys.stderr)
        return 2

    # 3. 差分サマリ
    added   = [r['name'] for r in records if r['name'] not in ex_by_name]
    changed = []
    for r in records:
        ex = ex_by_name.get(r['name'])
        if not ex:
            continue
        diff = [f"{k}:{ex.get(k, '')}→{r[k]}" for k in HEADER if k != 'imageUrl' and (ex.get(k) or '') != r[k]]
        if diff:
            changed.append(f"{r['name']}: " + ', '.join(diff))
    print(f'✓ 差分: 追加 {len(added)} / 変更 {len(changed)} / 削除 {len(missing) if a.drop_missing else 0} / 合計 {len(records)} 人')
    for n in added:
        print(f'  + {n}')
    for c in changed:
        print(f'  ~ {c}')

    # 4. 出力
    blocks = group_by_school(records, load_school_order())
    text = render_csv(blocks, eol)
    if a.dry_run:
        print('✓ dry-run: CSV は書き換えていません')
        return 0
    CSV_PATH.write_bytes((b'\xef\xbb\xbf' if bom else b'') + text.encode('utf-8'))
    print(f'✓ 出力: {CSV_PATH.relative_to(ROOT)} ({len(records)} 人 / {len(blocks)} 校)')

    if a.build:
        print('→ build-students.py を実行します')
        sys.stdout.flush()
        return subprocess.run([sys.executable, str(BUILD_SCRIPT)]).returncode
    print('→ 続けて `python scripts/build-students.py` を実行して JSON を再生成してください')
    return 0


if __name__ == '__main__':
    sys.exit(main())
