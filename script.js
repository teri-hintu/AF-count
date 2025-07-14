// script.js
document.addEventListener('DOMContentLoaded', () => {
    // HTML要素の取得
    const cardButtons = document.querySelectorAll('.card-icon');
    const resetButton = document.getElementById('reset-button');
    const pastCoreDisplay = document.getElementById('past-core-display');
    const futureCoreDisplay = document.getElementById('future-core-display');

    // 各カードの現在のプレイ枚数を保存するオブジェクト
    let cardCounts = {};

    // トークン総量
    let pastCoreTotal = 0;
    let futureCoreTotal = 0;

    // トークン画像のパスを定義
    const tokenImageBasePaths = {
        past_core: "パスト・コア.png",
        future_core: "フューチャー・コア.png"
    };

    // アプリ初期化処理
    function initializeApp() {
        cardButtons.forEach(button => {
            const cardId = button.id;
            cardCounts[cardId] = 0;
            const countDisplay = button.querySelector('.card-count');
            if (countDisplay) {
                countDisplay.textContent = 0;
            }

            button.addEventListener('click', () => {
                handleCardClick(button);
            });
        });

        resetButton.addEventListener('click', resetAllCounts);

        updateTotalTokenDisplay();
    }

    // カードがクリックされたときの処理
    function handleCardClick(clickedButton) {
        const cardId = clickedButton.id;
        const oldCardCount = cardCounts[cardId];
        const newCardCount = (oldCardCount + 1) % 4; // 0 -> 1 -> 2 -> 3 -> 0 のループ

        // クリックしたカードが持つトークン消費/生成情報
        const requiredPastCore = parseInt(clickedButton.dataset.pastCoreCost || '0', 10);
        const requiredFutureCore = parseInt(clickedButton.dataset.futureCoreCost || '0', 10);
        const requiredAnyCore = parseInt(clickedButton.dataset.anyCoreCost || '0', 10);
        const gainPastCore = parseInt(clickedButton.dataset.pastCoreGain || '0', 10);
        const gainFutureCore = parseInt(clickedButton.dataset.futureCoreGain || '0', 10);

        // トークン総量の仮計算
        let nextPastCoreTotal = pastCoreTotal;
        let nextFutureCoreTotal = futureCoreTotal;

        // --- 4枚目クリック時のリセット処理 ---
        if (oldCardCount === 3 && newCardCount === 0) { // 3から0にリセットされる瞬間
            // このカードがこれまでに生成したトークン（oldCardCount分）を差し戻す
            nextPastCoreTotal -= (gainPastCore * oldCardCount); // ★修正
            nextFutureCoreTotal -= (gainFutureCore * oldCardCount); // ★修正

            // このカードがこれまでに消費したトークン（oldCardCount分）を戻す
            // 固定コストを戻す
            nextPastCoreTotal += (requiredPastCore * oldCardCount); // ★修正
            nextFutureCoreTotal += (requiredFutureCore * oldCardCount); // ★修正
            
            // 任意のトークンコストを戻す（これは複雑なため、シンプルに総量から戻す）
            // 注意: 任意のトークンの戻し方は、消費された際の優先順位を完全に逆にする必要があるため、厳密には複雑
            // ここでは簡易的に、現在の総量から任意のトークンの総コスト分を戻そうと試みますが、
            // 元々消費されたトークンの種類がわからないため、厳密な復元は困難です。
            // ユーザーが「任意」と指定したトークンを戻す最適な方法は、ユーザーがどちらを消費したかを記録するか、
            // あるいは、最もバランスの取れた方法（例：少ない方から戻す）を仮定することになります。
            // 現状の「多い方から消費」の逆は「少ない方から戻す」だが、これは実装が複雑になる。
            // シンプルに、仮に消費されたパスト・コアとフューチャー・コアの合計から戻すと考える。
            // ここは一旦、単純に任意のコスト分をパスト・コアから優先的に戻すとします（要調整）
            let tempAnyCoreToRestore = requiredAnyCore * oldCardCount; // ★修正: oldCardCount分
             while(tempAnyCoreToRestore > 0) {
                if (nextPastCoreTotal < pastCoreTotal && nextPastCoreTotal <= nextFutureCoreTotal) { // 消費で減っているパストコアを優先
                     nextPastCoreTotal++;
                } else if (nextFutureCoreTotal < futureCoreTotal && nextFutureCoreTotal < nextPastCoreTotal) { // 消費で減っているフューチャーコアを優先
                    nextFutureCoreTotal++;
                } else { // どちらも減っていない、または消費コストがない場合
                    break;
                }
                tempAnyCoreToRestore--;
            }
            
            // 複合カード（デストロイ系、イクシード）が消費した前段階のカードのカウントも戻す
            // isResetClickがtrueの場合、restorePreviousCardCountsを呼び出す
            restorePreviousCardCounts(clickedButton, oldCardCount); // ★oldCardCountを渡す
            
        } else { // 通常のクリック（1, 2, 3枚目のプレイ）
            // トークン消費（減算）のシミュレーション
            let tempPastCoreTotal = nextPastCoreTotal;
            let tempFutureCoreTotal = nextFutureCoreTotal; // ★修正

            // 固定コストの減算
            tempPastCoreTotal -= requiredPastCore;
            tempFutureCoreTotal -= requiredFutureCore;

            // 任意のトークンコストの減算
            let tempAnyCore = requiredAnyCore;
            while (tempAnyCore > 0) {
                if (tempPastCoreTotal > 0 && tempPastCoreTotal >= tempFutureCoreTotal) {
                    tempPastCoreTotal--;
                } else if (tempFutureCoreTotal > 0) {
                    tempFutureCoreTotal--;
                } else {
                    break; // 消費するトークンが足りない
                }
                tempAnyCore--;
            }

            // コストが足りているか最終チェック
            if (tempPastCoreTotal < 0 || tempFutureCoreTotal < 0 || tempAnyCore > 0) {
                alert(`「${clickedButton.dataset.cardName}」をプレイするには、トークンが足りません。\n必要なトークン: パスト・コア ${requiredPastCore}, フューチャー・コア ${requiredFutureCore}, 任意のトークン ${requiredAnyCore}\n現在のトークン: パスト・コア ${pastCoreTotal}, フューチャー・コア ${futureCoreTotal}`);
                return; // コストが足りなければ処理を中断
            }

            // 特定のカードプレイ枚数コストのチェック（デストロイ系、イクシード用）
            const prevCardCostMet = checkPreviousCardCosts(clickedButton);
            if (!prevCardCostMet) {
                if (clickedButton.dataset.prevCardCost || clickedButton.dataset.prevCardCost2 || clickedButton.dataset.prevCardCost3) { 
                    alert(`「${clickedButton.dataset.cardName}」をプレイするには、特定のカードが足りません。`);
                    return; // コストが足りなければ処理を中断
                }
            }
            
            // --- 実際のトークン総量の適用（消費と生成） ---
            nextPastCoreTotal = tempPastCoreTotal;
            nextFutureCoreTotal = tempFutureCoreTotal;

            // トークン生成の適用
            nextPastCoreTotal += gainPastCore;
            nextFutureCoreTotal += gainFutureCore; // ★修正
        }

        // トークン総量を更新
        pastCoreTotal = Math.max(0, nextPastCoreTotal);
        futureCoreTotal = Math.max(0, nextFutureCoreTotal);

        // 各カードのプレイ枚数を更新
        cardCounts[cardId] = newCardCount;

        // プレイ枚数とトークン総量の表示を更新
        updateCardCountDisplay(cardId);
        updateTotalTokenDisplay();
    }

    // 特定のカードのプレイ枚数表示を更新する関数
    function updateCardCountDisplay(cardId) {
        const button = document.getElementById(cardId);
        if (button) {
            const countDisplay = button.querySelector('.card-count');
            if (countDisplay) {
                countDisplay.textContent = cardCounts[cardId];
            }
        }
    }

    // トークン総量の表示を更新する関数
    function updateTotalTokenDisplay() {
        pastCoreDisplay.innerHTML = '';
        for (let i = 0; i < pastCoreTotal; i++) {
            const img = document.createElement('img');
            img.src = tokenImageBasePaths.past_core; 
            img.alt = `パスト・コア`;
            pastCoreDisplay.appendChild(img);
        }

        futureCoreDisplay.innerHTML = '';
        for (let i = 0; i < futureCoreTotal; i++) {
            const img = document.createElement('img');
            img.src = tokenImageBasePaths.future_core; 
            img.alt = `フューチャー・コア`;
            futureCoreDisplay.appendChild(img);
        }
    }

    // 特定のカードがプレイされているかチェックするヘルパー関数
    function getCardPlayCount(cardId) {
        return cardCounts[cardId] || 0;
    }

    // 前段階のカードプレイコストをチェックする関数 (2枚目以降も消費)
    function checkPreviousCardCosts(clickedButton) {
        // イクシードアーティファクトΩ の特別なチェック (card18)
        if (clickedButton.id === "card18") { 
            const destroyAlphaCount = getCardPlayCount("card15"); 
            const destroyBetaCount = getCardPlayCount("card16"); 
            const destroyGammaCount = getCardPlayCount("card17");

            if (destroyAlphaCount >= 1 && destroyBetaCount >= 1 && destroyGammaCount >= 1) {
                // 条件を満たしているので、対応するカードのプレイ数を1減らす (消費)
                cardCounts["card15"] = (cardCounts["card15"] - 1 + 4) % 4;
                cardCounts["card16"] = (cardCounts["card16"] - 1 + 4) % 4;
                cardCounts["card17"] = (cardCounts["card17"] - 1 + 4) % 4;
                updateCardCountDisplay("card15");
                updateCardCountDisplay("card16");
                updateCardCountDisplay("card17");
                return true;
            } else {
                return false;
            }
        }
        
        // デストロイアーティファクトα, β, γ のチェック (card15, card16, card17)
        const prevCardCost = parseInt(clickedButton.dataset.prevCardCost || '0', 10);
        const prevCardIds = clickedButton.dataset.prevCardIds ? clickedButton.dataset.prevCardIds.split(',') : [];

        if (prevCardCost === 0) { 
            return true;
        }

        let satisfiedCount = 0;
        let eligibleConsumedCardIds = [];

        for (const id of prevCardIds) {
            if (getCardPlayCount(id) >= 1) { 
                eligibleConsumedCardIds.push(id); 
                if (eligibleConsumedCardIds.length >= prevCardCost) {
                    break;
                }
            }
        }

        if (eligibleConsumedCardIds.length >= prevCardCost) {
            // 条件を満たしているので、対応するカードのプレイ数を1減らす (消費)
            for (let i = 0; i < prevCardCost; i++) { // ★修正済
                const consumedId = eligibleConsumedCardIds[i];
                cardCounts[consumedId] = (cardCounts[consumedId] - 1 + 4) % 4;
                updateCardCountDisplay(consumedId);
            }
            return true;
        } else {
            return false;
        }
    }

    // 複合カードが消費した前段階のカードのカウントを戻す関数（リセット時用）
    // oldCardCountを引数に追加
    function restorePreviousCardCounts(clickedButton, oldCardCount) { // ★oldCardCountを引数に追加
        // イクシードアーティファクトΩ の特別なチェック (card18)
        if (clickedButton.id === "card18") {
            // デストロイ系カードのカウントを oldCardCount分増やす
            // ここでoldCardCountは3なので、3枚分戻す
            for (let i = 0; i < oldCardCount; i++) { // ★修正: oldCardCount分ループ
                cardCounts["card15"] = (cardCounts["card15"] + 1) % 4;
                cardCounts["card16"] = (cardCounts["card16"] + 1) % 4;
                cardCounts["card17"] = (cardCounts["card17"] + 1) % 4;
            }
            updateCardCountDisplay("card15");
            updateCardCountDisplay("card16");
            updateCardCountDisplay("card17");
            return;
        }
        
        // デストロイアーティファクトα, β, γ のチェック
        const prevCardCost = parseInt(clickedButton.dataset.prevCardCost || '0', 10);
        const prevCardIds = clickedButton.dataset.prevCardIds ? clickedButton.dataset.prevCardIds.split(',') : [];

        if (prevCardCost === 0) {
            return;
        }

        // このカードがプレイされたことで消費された前段階カードを見つけて戻す
        // oldCardCount分（つまり3回分）の消費を戻す
        for (let j = 0; j < oldCardCount; j++) { // ★修正: oldCardCount分ループ
            for (let i = 0; i < prevCardCost; i++) { 
                const consumedId = prevCardIds[i % prevCardIds.length]; 
                if (consumedId) {
                    cardCounts[consumedId] = (cardCounts[consumedId] + 1) % 4;
                    updateCardCountDisplay(consumedId);
                }
            }
        }
    }


    // 全てのカウントをリセットする関数
    function resetAllCounts() {
        cardButtons.forEach(button => {
            const cardId = button.id;
            cardCounts[cardId] = 0; // 各カードのプレイ枚数をリセット
            updateCardCountDisplay(cardId); // 表示もリセット
        });

        pastCoreTotal = 0; // トークン総量もリセット
        futureCoreTotal = 0; // トークン総量もリセット
        updateTotalTokenDisplay(); // トークン総量の表示を更新
    }

    // アプリを初期化する
    initializeApp();
});