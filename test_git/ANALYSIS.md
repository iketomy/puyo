## プログラムの解析と仕様書

このプロジェクトは、HTML、CSS、JavaScript で構成される「ぷよぷよ風ゲーム」です。

**`index.html`**:
- ゲームの基本的な構造を定義しています。
- ゲームキャンバス (`game-canvas`)、次のぷよを表示するキャンバス (`next-canvas`)、スコア表示 (`score`)、操作説明、そしてゲーム開始/ポーズ/ゲームオーバー時に表示されるオーバーレイ要素が含まれています。
- `style.css` と `game.js` を読み込んでいます。
- `sounds/` ディレクトリから音声ファイルを読み込む記述がありますが、これらのファイルは現在のディレクトリには存在しません。

**`style.css`**:
- ゲームの見た目を定義するCSSファイルです。
- レトロゲーム風のフォント (`Press Start 2P`) を使用し、全体的にダークなテーマでデザインされています。
- ゲームフィールド、情報表示エリア、NEXTぷよ表示エリア、ボタンなどのスタイルが定義されています。

**`game.js`**:
- ゲームの主要なロジックが実装されています。
- **ゲームボード**: `COLS` (6列) と `ROWS` (12行) で定義されたフィールド配列 (`field`) でゲームボードの状態を管理しています。
- **ぷよ**: `PUYO_COLORS` と `PUYO_GRADIENT_COLORS` でぷよの色を定義しています。
- **ゲームの状態**: `gameState` 変数 (`start`, `playing`, `checking`, `paused`, `gameover`) でゲームの状態を管理しています。
- **ゲームループ**: `gameLoop` 関数が `requestAnimationFrame` を使って継続的に描画とロジックの更新を行っています。
- **ぷよの生成と落下**: `spawnPuyo` で新しいぷよを生成し、`gameLoop` 内で自動落下させています。
- **衝突判定**: `checkCollision` 関数でぷよの移動や回転時の衝突を判定しています。
- **ぷよの固定**: `lockPuyo` でぷよが着地した際にフィールドに固定します。
- **連鎖処理**: `handleChains` 関数でぷよが消える処理と連鎖を処理しています。`findPuyosToClear` で消えるぷよを検出し、`clearPuyos` で消去、`applyGravity` で重力を適用しています。
- **スコア**: `score` 変数でスコアを管理し、`scoreElement` に表示しています。ハイスコア機能も実装されており、`localStorage` に保存されます。
- **操作**: キーボードイベントリスナーで、左右移動、回転、高速落下、ポーズ/再開を処理しています。
- **音声**: `sounds` オブジェクトで効果音とBGMを管理しています。`playSound` と `stopSound` 関数で再生/停止を制御しています。ただし、音声ファイル自体は存在しません。
- **オーバーレイ**: ゲームの状態に応じてスタート画面、ポーズ画面、リスタートボタンの表示/非表示を制御しています。

## 今後の開発計画

1.  **バグの特定と修正**:
    -   現在、ゲームがうまく動作しないとのことなので、まずはその原因を特定し、修正します。
    -   特に、音声ファイルが存在しないことによるエラーや、ゲームロジックの不具合が考えられます。
    -   `game.js` の `checkCollision` 関数や `handleChains` 関数、キー入力処理などを重点的に確認します。
    -   `game.js` の `draw` 関数内の `else` ブロックで、ぷよがない行の背景色を塗りつぶす処理が、`c * BLOCK_SIZE` を使っているため、列ごとに塗りつぶしが行われていません。これは描画のバグである可能性があります。

2.  **音声ファイルの追加**:
    -   `game.js` で参照されている音声ファイル (`sounds/rotate.wav`, `sounds/lock.wav`, `sounds/clear.wav`, `sounds/chain.wav`, `sounds/gameover.wav`, `sounds/bgm.mp3`) が存在しないため、ゲーム内で音声が再生されません。
    -   これらの音声ファイルをプロジェクトに追加するか、音声再生部分を一時的に無効にする必要があります。今回は、ゲームが動作しない原因特定が優先なので、一時的に音声再生部分をコメントアウトすることを検討します。

3.  **テスト環境の構築**:
    -   ゲームの動作確認を効率的に行うために、ローカルでゲームを実行できる環境を構築します。
    -   PythonのSimpleHTTPServerなどを使って、Webサーバーを立ち上げることを検討します。

4.  **コードの改善とリファクタリング**:
    -   バグ修正後、必要に応じてコードの可読性向上やパフォーマンス改善のためのリファクタリングを行います。
    -   例えば、ぷよの回転ロジックは、現在の実装では子ぷよの位置を直接計算していますが、より汎用的な回転行列などを使用することも検討できます。

## バグの原因特定と対策の検討

「うまく動作しない」という情報だけでは具体的な原因を特定しにくいですが、コードを読んだ限りでいくつか可能性のある箇所と対策を検討します。

**可能性のあるバグ箇所:**

1.  **音声ファイルの欠落**:
    -   `game.js` で `new Audio(...)` を使って音声ファイルを読み込もうとしていますが、これらのファイルがプロジェクト内に存在しません。
    -   これにより、音声再生時にエラーが発生し、JavaScriptの実行が停止したり、予期せぬ動作を引き起こす可能性があります。
    -   ブラウザのコンソールにエラーメッセージが表示されるはずです。

2.  **`draw` 関数内の描画ロジック**:
    -   `draw` 関数内で、`field` が0のセル（ぷよがない場所）の背景を塗りつぶす部分に問題があります。
    -   ```javascript
        else {
            context.fillStyle = '#1a252f';
            context.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        }
        ```
    -   この `else` ブロックは、`field[r][c] > 0` でない場合に実行されますが、`c * BLOCK_SIZE` を使っているため、`r` 行目の `c` 列目のセルだけが塗りつぶされます。
    -   期待される動作は、ぷよがない行全体を背景色で塗りつぶすことかもしれません。しかし、現在のコードでは、`for (let r = 0; r < ROWS; r++)` のループ内で、`for (let c = 0; c < COLS; c++)` のループが回っているため、`field[r][c]` が0の場合にそのセルだけが塗りつぶされます。これは、ゲームフィールドの背景が正しく描画されない原因になる可能性があります。

3.  **ぷよの回転ロジック**:
    -   `ArrowUp` キーが押されたときの回転ロジックが、子ぷよの位置を直接計算しています。
    -   ```javascript
        case 'ArrowUp':
            const nextRotation = (currentPuyo.rotation + 1) % 4;
            let nextChildX = currentPuyo.x, nextChildY = currentPuyo.y;
            if (nextRotation === 0) nextChildY--;
            else if (nextRotation === 1) nextChildX++;
            else if (nextRotation === 2) nextChildY++;
            else if (nextRotation === 3) nextChildX--;
            if (!checkCollision(currentPuyo, 0, 0, nextChildX, nextChildY)) {
                currentPuyo.child.x = nextChildX; currentPuyo.child.y = nextChildY; currentPuyo.rotation = nextRotation;
                playSound('rotate');
            }
            break;
        ```
    -   これは、親ぷよを基準とした相対位置の計算が正しく行われているか、特に壁や他のぷよとの衝突判定が正確に行われているかを確認する必要があります。
    -   ぷよぷよの回転は、中心となるぷよの周りをもう一方のぷよが回転する形になるため、このロジックが複雑になりがちです。

4.  **`checkCollision` 関数内の配列アクセス**:
    -   `field[checkPuyoY]?.[checkPuyoX]` や `field[checkChildY]?.[checkChildX]` のようにオプショナルチェイニング (`?.`) を使用していますが、これは `checkPuyoY` や `checkChildY` が負の値になった場合に `undefined` を返す可能性があります。
    -   `checkPuyoY >= 0` や `checkChildY >= 0` のチェックはありますが、念のため、配列の範囲外アクセスによるエラーがないか確認が必要です。

5.  **ゲーム開始時の画面切り替えの不具合**:
    -   `startGame()` 関数で `gameState` が `'playing'` に設定された後、オーバーレイの表示を更新する `updateOverlayVisibility()` 関数が呼び出されていない問題。

6.  **`field` 配列の初期化タイミング**:
    -   `gameLoop` が `DOMContentLoaded` イベントで開始され、すぐに `draw` 関数を呼び出すのに対し、`field` 配列の初期化が `startGame` 関数（Enterキーが押された後）で行われるため、最初の描画時に `field` がまだ空の配列であるために発生するエラー。

**対策の検討:**

1.  **音声ファイルの対策**:
    -   **一時的な対策**: `game.js` 内の `sounds` オブジェクトの定義と `playSound`, `stopSound` 関数の呼び出しを一時的にコメントアウトし、音声再生によるエラーを回避します。
    -   **恒久的な対策**: 適切な音声ファイルを用意し、`sounds/` ディレクトリに配置します。

2.  **`draw` 関数内の描画ロジックの修正**:
    -   `draw` 関数内の `else` ブロックを削除し、`context.clearRect(0, 0, canvas.width, canvas.height);` の後に、ゲームフィールド全体の背景色を一度塗りつぶすように変更します。
    -   例: `context.fillStyle = '#1a252f'; context.fillRect(0, 0, canvas.width, canvas.height);`

3.  **ぷよの回転ロジックのデバッグ**:
    -   回転時の `nextChildX`, `nextChildY` の計算が正しいか、紙とペンでシミュレーションするか、デバッガを使ってステップ実行で確認します。
    -   特に、回転後のぷよがフィールドの境界を越えたり、既存のぷよと重なったりしないかを確認します。

4.  **`checkCollision` 関数の改善**:
    -   `checkPuyoY` や `checkChildY` が負の値になる可能性を考慮し、配列アクセス前にこれらの値が有効な範囲内にあることをより厳密にチェックします。

5.  **ゲーム開始時の画面切り替えの修正**:
    -   `startGame()` 関数内で `gameState = 'playing';` の直後に `updateOverlayVisibility();` を追加します。
    -   `gameLoop()` 関数内のオーバーレイ表示制御ロジックをコメントアウトし、`updateOverlayVisibility()` 関数で一元的に管理するようにします。

6.  **`field` 配列の初期化タイミングの修正**:
    -   `let field = [];` を `let field = Array.from({ length: ROWS }, () => Array(COLS).fill(0));` に変更し、`field` 配列をスクリプトのロード時に初期化するようにします。
