# AI Coding Agent Guidelines & Technical Constraints
あなたはこのプロジェクトのコア開発を担うシニアフルスタックエンジニアです。
以下のアーキテクチャ、制約条件、パフォーマンス要件、およびコーディング規約を厳格に遵守してコードを生成・リファクタリングしてください。

## 1. システム構成 & コンテナ責務境界 (4-Container)

1. **client (:8010)**: Vue 3 + Phaser 4 + Three.js (@pixiv/three-vrm) + Pinia + Howler + PeerJS
   - 責務: 画面描画（60fps死守）、入力処理、ローカル座標管理、VRMモーション
2. **router (:8788)**: Node.js (v24-alpine) + Hono.js + @hono/node-ws + ioredis
   - 責務: WebSocket 座標集約、近接判定、Redis チャンク所有権 (Lease)、DeltaMap 集約、関係性ログ
3. **server (:8787)**: Python 3.11+ + FastAPI + Uvicorn + LangGraph + NetworkX
   - 責務: Ollama プロキシ、Fast Path (GBNF構文拘束ストリーム)、Deep Path (非同期パラメータ・記憶計算)、外部検索
4. **redis (:6379)**: Redis Alpine
   - 責務: チャンク Lease TTL (5s)、DeltaMap Hash (`dmap:{cx}:{cy}`)、対話履歴 Hash (`rel:{npcId}:{uuid}`)、オフライン Push キュー

## 2. 絶対遵守の技術的制約 (Non-Negotiable Rules)

### A. 言語・型システム規約
- **TypeScript は使用禁止**。純粋な **JavaScript (ESNext, Strict ESM)** で記述すること。
- **JSDoc の徹底**: 全てのクラス、関数、プロパティに `@param`, `@returns`, `@type`, `@typedef` を付与し、`jsconfig.json` の `checkJs: true` で型エラーが出ない状態を保つこと。
- **構文検証 (`node --check`)**: `(expr ?? {},)` のような Chrome/V8 で構文破壊を起こす不正カンマは厳禁。

### B. 60fps 維持・GC (Garbage Collection) スパイク撲滅
- **座標空間キーは BigInt 64bit を使用**:
  `"tx,ty"` のような一時文字列結合は禁止。
  `const key = (BigInt(tx) << 32n) | (BigInt(ty) & 0xFFFFFFFFn);` を用いて GC をゼロにすること。
- **毎フレームのインスタンス破棄・生成禁止**:
  `update()` ループ内で `new THREE.Vector*`, `new Phaser.Math.Vector2`, 配列 `[]`, オブジェクト `{}` を生成しない。事前確保したプールを再利用すること。
- **通信・パースの Worker 分離**:
  P2P 以外の REST 通信、JSON パース、差分展開はすべて `NetworkWorker.js` にオフロードし、メインスレッドをブロックしないこと。

### C. 座標系 (Floating Origin) のルール
- 世界の絶対座標は `int32`。Phaser の描画・物理空間は `SECTOR_SIZE = 2048px (64タイル)` 単位のローカル座標。
- セクタ越境時（`FloatingOrigin.checkRebase`）は、**全 Display Object および Arcade Body の `position` と `prev` を一括で `-dx, -dy` オフセット**し、同時に `camera.scrollX/Y` を同量オフセットすること。
- 物理シミュレーション途中でのリベースを避け、`postupdate` または移動確定直後に実行すること。

### D. マップ描画 (CanvasTexture 差分スクロール)
- マップ全域の一括再描画（GPU stall の原因）は禁止。
- タイル境界跨ぎ時に Canvas 内容をシフトし、**新規に露出した境界行/列のみを差分描画**すること。

### E. 中国語フィルタの誤爆回避
- LLM 出力の言語検疫を行う際、日本語常用漢字である `了`, `是` を除外条件に含めないこと。
- 判定は `吗, 呢, 吧, 哪, 这, 什, 么` 等の簡体字限定文字セットで行うこと。

## 3. レイヤー別 実装仕様 & パターン

### 3.1 Client: VRM プロシージャル演出 (`client/src/vrm/`)
- 手作業の FBX アニメーションに頼らず、コードによる微小運動を毎フレーム合成すること：
  1. **呼吸 (Breathing)**: 胸 (`Chest`) の回転（周期3.5s）に対し、背骨 (`Spine`) を位相差 `-0.4rad` で追従。
  2. **体幹揺らぎ (Sway)**: 素数比サイン波 (`0.7Hz`, `1.3Hz`, `0.5Hz`) の合成で首・頭部の周期性を消す。
  3. **サッカード視線 (Saccade)**: 0.3〜1.5s ごとに相手の顔（両目・口元）の範囲で目標角度をランダム跳躍。
  4. **非対称まばたき**: 0.07s で閉じ、0.11s かけて緩やかに開く。
  5. **思考時演出 (`setThinking(true)`)**: フィラー受信時に即時まばたきを発火させ、視線と首を斜め下に傾ける。
  6. **レストポーズ (`applyRestPose`)**: 指4本に漸増カール、親指の内旋、手首の脱力を適用して人形感を排除。

### 3.2 Client: 1,000 パラメータ設計 (`client/src/stores/parameterStore.js`)
- `Float32Array(1000)` のフラットバッファで保持。
- 帯域:
  - `0〜99`: 生体（0: ウイルス感染度, 1: 放射能汚染度）
  - `100〜199`: 信頼・対人（100: プレイヤー信頼度）
  - `200〜299`: 戦闘・行動（200: ボイド執着度）
  - `300〜399`: 性格・認知
  - `400〜499`: 嗜好・関心
  - `500〜599`: 一時感情
  - `600〜999`: 記憶・将来予約
- バックエンドから届く `{ index: number, delta: number }[]` をインプレース加算（`0.0〜1.0` クランプ）。

### 3.3 Router: Hono.js + Redis (`router/src/`)
- **チャンク所有権 (Lease)**:
  - `SET chunk:lease:{cx}:{cy} {uuid} EX 5 NX`
  - オーナーは 2s ごとにハートビート送信。切断時は 5s で自動失効し、隣接プレイヤーへフェイルオーバー。
  - `/entities/report` はリース保持者のみ 200 OK、非所有者は 409 Rejected。
- **DeltaMap (整地・建築)**:
  - `dmap:{cx}:{cy}` Hash に保存。
  - 拠点生成時は 6x6 範囲に `kind: 'flat'` スタンプ（障害物・汚染を強制クリア）を適用し、地形めり込みを防止。
- **NPC & 会話時刻**:
  - NPC ID は `npc_{cx}_{cy}_{index}` の決定論的命名。
  - `rel:{npcId}:{uuid}` Hash に `lastInteractionTime` と直近 10 件の会話ログを永続化。

### 3.4 Server: AI 二重経路パイプライン (`server/`)
- **Fast Path (`/dialog/stream`)**:
  - 初回トークン遅延（~15s）を隠蔽するため、リクエスト受信直後に即時フィラー（`{"t":"……えっと、","e":"thinking"}`）を送出すること。
  - GBNF（Grammar）により `[{"t": "...", "e": "..."}]` の構造化配列に物理拘束。
  - `format_time_delta` により、前回対話からの経過時間（「数分ぶり」「数日ぶり」）をプロンプト最末尾へ注入。
- **Deep Path (`async_tasks.py`)**:
  - 会話ストリーム完了後、バックグラウンドタスクで 1000 パラメータ変動・Graph RAG 更新・検索クエリ抽出を実行。
  - 結果は `POST http://router:8788/push` 経由で対象クライアントの WebSocket へ非同期配信。

## 4. 使用可能なツール

* playlight / puppeteer / X11
* その他必要に応じたツールのインストールを許可する
