// script.js
document.addEventListener('DOMContentLoaded', () => {
    // HTML要素の取得
    const cardButtons = document.querySelectorAll('.card-icon'); // プレイされたカード
    const resetButton = document.getElementById('reset-button');
    const pastCoreDisplay = document.getElementById('past-core-display');
    const futureCoreDisplay = document.getElementById('future-core-display');
    const fusionModal = document.getElementById('fusion-modal'); // モーダル
    const fusionModalTitle = document.getElementById('fusion-modal-title'); // モーダルタイトル
    const fusionInstructions = document.getElementById('fusion-instructions'); // 説明文
    const fusionCardOptionsContainer = document.getElementById('fusion-card-options'); // カード選択肢コンテナ
    const fusionTokenOptionsContainer = document.getElementById('fusion-token-options'); // トークン選択肢コンテナ
    const confirmFusionSelectionButton = document.getElementById('confirm-fusion-selection'); // 融合確定ボタン
    const closeFusionModalButton = document.getElementById('close-fusion-modal'); // モーダルを閉じるボタン

    // 各カードの現在のプレイ枚数を保存するオブジェクト
    let cardCounts = {};

    // トークン総量
    let pastCoreTotal = 0;
    let futureCoreTotal = 0;

    // トークン画像のパスを定義 (ファイル名のみを格納)
    const tokenImageBaseNames = {
        past_core: "パスト・コア.png",
        future_core: "フューチャー・コア.png"
    };
    const IMAGE_BASE_PATH = ""; // 画像ファイルがルート直下にあるため空文字。もしimageフォルダがあれば "image/" に設定

    // 全カードのメタデータを保持するオブジェクト
    const allCardData = {};

    // --- 融合元選択の現在の状態を追跡する変数 ---
    let currentTargetCardData = null; 
    let selectedSourceCards = {}; 
    let selectedSourceTokens = {past_core: 0, future_core: 0};
    
    // アプリ初期化処理
    function initializeApp() {
        cardButtons.forEach(button => {
            const cardId = button.id;
            cardCounts[cardId] = 0;
            const countDisplay = button.querySelector('.card-count');
            if (countDisplay) {
                countDisplay.textContent = 0;
            }

            // data属性からカードデータを収集
            allCardData[cardId] = {
                id: cardId,
                name: button.dataset.cardName,
                imgSrc: button.querySelector('img').getAttribute('src'),
                pastCoreCost: parseInt(button.dataset.pastCoreCost || '0', 10),
                futureCoreCost: parseInt(button.dataset.futureCoreCost || '0', 10),
                anyCoreCost: parseInt(button.dataset.anyCoreCost || '0', 10),
                pastCoreGain: parseInt(button.dataset.pastCoreGain || '0', 10),
                futureCoreGain: parseInt(button.dataset.futureCoreGain || '0', 10),
                prevCardCost: parseInt(button.dataset.prevCardCost || '0', 10),
                prevCardIds: button.dataset.prevCardIds ? button.dataset.prevCardIds.split(',') : [],
                prevCardCost2: parseInt(button.dataset.prevCardCost2 || '0', 10),
                prevCardIds2: button.dataset.prevCardIds2 ? button.dataset.prevCardIds2.split(',') : [],
                prevCardCost3: parseInt(button.dataset.prevCardCost3 || '0', 10),
                prevCardIds3: button.dataset.prevCardIds3 ? button.dataset.prevCardIds3.split(',') : []
            };

            // イベントリスナーをカードの種類に応じて分ける
            if (button.closest('.fused-cards')) {
                button.addEventListener('click', () => {
                    showFusionSourceSelection(allCardData[cardId]);
                });
            } else {
                button.addEventListener('click', () => {
                    handleCardClick(button);
                });
            }
        });

        resetButton.addEventListener('click', resetAllCounts);
        closeFusionModalButton.addEventListener('click', hideFusionModal);
        confirmFusionSelectionButton.addEventListener('click', executeFusionAction);

        updateTotalTokenDisplay();
    }

    // --- ポップアップ関連ロジック ---
    function showFusionSourceSelection(targetCardData) {
        currentTargetCardData = targetCardData;
        selectedSourceCards = {};
        selectedSourceTokens = {past_core: 0, future_core: 0};
        confirmFusionSelectionButton.disabled = true;

        fusionCardOptionsContainer.innerHTML = '';
        fusionTokenOptionsContainer.innerHTML = '';
        fusionInstructions.innerHTML = '';

        fusionModalTitle.textContent = `「${targetCardData.name}」を融合するために消費するカード/トークンを選択`;

        let instructionsText = `<p>融合に必要:</p><ul>`;
        let totalRequiredAny = targetCardData.anyCoreCost;
        
        if (targetCardData.pastCoreCost > 0) instructionsText += `<li>パスト・コア: ${targetCardData.pastCoreCost}枚 (必須)</li>`;
        if (targetCardData.futureCoreCost > 0) instructionsText += `<li>フューチャー・コア: ${targetCardData.futureCoreCost}枚 (必須)</li>`;
        
        if (totalRequiredAny > 0) instructionsText += `<li>任意のトークン (パスト・コア / フューチャー・コア): ${totalRequiredAny}枚 (選択)</li>`;

        let sourceCandidatesIds = [];
        if (targetCardData.id === "card18") { // イクシードΩ
            instructionsText += `<li>デストロイアーティファクトα, β, γ 各1枚 (必須)</li>`;
            sourceCandidatesIds = ["card15", "card16", "card17"];
        } else if (targetCardData.id === "card17") { // ★デストロイアーティファクトγ の場合
            instructionsText += `<li>アタックアーティファクト / キャッスルアーティファクト: 2枚 (選択)</li>`;
            sourceCandidatesIds = ["card13", "card14"];
        } else if (["card15", "card16"].includes(targetCardData.id)) { // デストロイα, β の場合
            instructionsText += `<li>アタックアーティファクト / キャッスルアーティファクト: ${targetCardData.prevCardCost}枚 (選択)</li>`;
            sourceCandidatesIds = ["card13", "card14"];
        }
        instructionsText += `</ul>`;
        fusionInstructions.innerHTML = instructionsText;

        // --- トークン選択肢の表示 ---
        createTokenOptionButton('past_core', fusionTokenOptionsContainer);
        createTokenOptionButton('future_core', fusionTokenOptionsContainer);

        // --- 前段階カード選択肢の表示 ---
        sourceCandidatesIds.forEach(sourceCardId => {
            createCardOptionButton(sourceCardId, fusionCardOptionsContainer);
        });

        fusionModal.style.display = 'flex';
        updateModalSelectionStatus();
    }

    function hideFusionModal() {
        fusionModal.style.display = 'none';
        currentTargetCardData = null; 
        fusionModalTitle.textContent = `融合元のカードを選択`;
    }

    // トークン選択肢ボタンを作成するヘルパー関数
    function createTokenOptionButton(tokenType, container) {
        const tokenDisplay = (tokenType === 'past_core') ? 'パスト・コア' : 'フューチャー・コア';
        const currentTokenCount = (tokenType === 'past_core') ? pastCoreTotal : futureCoreTotal;

        const optionButton = document.createElement('button');
        optionButton.classList.add('fusion-token-option');
        optionButton.innerHTML = `
            <img src="${IMAGE_BASE_PATH}${tokenImageBaseNames[tokenType]}" alt="${tokenDisplay}">
            <span class="count-in-modal">(${currentTokenCount})</span>
        `;
        optionButton.dataset.tokenType = tokenType;
        optionButton.dataset.currentCount = currentTokenCount;

        optionButton.addEventListener('click', () => {
            toggleTokenSelection(tokenType);
        });
        container.appendChild(optionButton);
        return optionButton;
    }

    // カード選択肢ボタンを作成するヘルパー関数
    function createCardOptionButton(cardId, container) {
        const cardData = allCardData[cardId];
        const currentPlayCount = getCardPlayCount(cardId);

        const optionButton = document.createElement('button');
        optionButton.classList.add('fusion-card-option');
        optionButton.innerHTML = `
            <img src="${IMAGE_BASE_PATH}${cardData.imgSrc}" alt="${cardData.name}">
            <span class="count-in-modal">(${currentPlayCount})</span>
        `;
        optionButton.dataset.cardId = cardId;
        optionButton.dataset.currentCount = currentPlayCount;

        optionButton.addEventListener('click', () => {
            toggleCardSelection(cardId);
        });
        container.appendChild(optionButton);
        return optionButton;
    }

    // トークン選択の切り替えロジック
    function toggleTokenSelection(tokenType) {
        const currentCount = (tokenType === 'past_core') ? pastCoreTotal : futureCoreTotal;
        const selectedCount = (tokenType === 'past_core') ? selectedSourceTokens.past_core : selectedSourceTokens.future_core;

        if (selectedCount >= currentCount) {
            if (selectedCount > 0) {
                 if (tokenType === 'past_core') selectedSourceTokens.past_core--;
                 else selectedSourceTokens.future_core--;
            } else {
                return;
            }
        } else {
            if (tokenType === 'past_core') selectedSourceTokens.past_core++;
            else selectedSourceTokens.future_core++;
        }
        updateModalSelectionStatus();
    }

    // カード選択の切り替えロジック
    function toggleCardSelection(cardId) {
        const currentCount = getCardPlayCount(cardId);
        const selectedCount = selectedSourceCards[cardId] || 0;

        if (selectedCount >= currentCount) {
            if (selectedCount > 0) {
                selectedSourceCards[cardId]--;
            } else {
                return;
            }
        } else {
            selectedSourceCards[cardId] = (selectedSourceCards[cardId] || 0) + 1;
        }
        updateModalSelectionStatus();
    }

    // モーダル内の選択状況を更新し、確定ボタンの有効/無効を切り替える
    function updateModalSelectionStatus() {
        const targetCardData = currentTargetCardData;
        let meetsAllRequirements = true;

        // 1. 必須トークンコストのチェック
        let remainingPastCoreCost = targetCardData.pastCoreCost;
        let remainingFutureCoreCost = targetCardData.futureCoreCost;
        
        // ユーザーが選択した必須トークンはselectedSourceTokensには含まれないため、ここでチェック
        if (pastCoreTotal < remainingPastCoreCost || futureCoreTotal < remainingFutureCoreCost) {
             meetsAllRequirements = false;
        }

        // 2. 任意のトークンコストのチェック
        let requiredAnyCount = targetCardData.anyCoreCost;
        let currentAnySelected = selectedSourceTokens.past_core + selectedSourceTokens.future_core;

        if (currentAnySelected < requiredAnyCount) {
            meetsAllRequirements = false;
        }

        // 3. 必須前段階カードコストのチェック
        let prevCardRequirementsMet = true;
        
        if (targetCardData.id === "card18") { // イクシードΩは各デストロイが1枚ずつ必須
            if (!( (selectedSourceCards["card15"] || 0) >= 1 && 
                   (selectedSourceCards["card16"] || 0) >= 1 && 
                   (selectedSourceCards["card17"] || 0) >= 1 )) {
                prevCardRequirementsMet = false;
            }
        } else if (targetCardData.id === "card17") { // ★デストロイアーティファクトγ の場合
            let neededCount = targetCardData.prevCardCost; // 2
            let actualSelectedCount = 0;
            for (const cardId in selectedSourceCards) {
                if (targetCardData.prevCardIds.includes(cardId)) { // card13, card14 が対象
                    actualSelectedCount += selectedSourceCards[cardId];
                }
            }
            if (actualSelectedCount < neededCount) {
                prevCardRequirementsMet = false;
            }
        } 
        else if (["card15", "card16"].includes(targetCardData.id)) { // デストロイα, β の場合
            let neededCount = targetCardData.prevCardCost; // 1
            let actualSelectedCount = 0;
             for (const cardId in selectedSourceCards) { // 選択されたカードがprevCardIdsに含まれるか
                if (targetCardData.prevCardIds.includes(cardId)) {
                    actualSelectedCount += selectedSourceCards[cardId];
                }
            }
            if (actualSelectedCount < neededCount) {
                prevCardRequirementsMet = false;
            }
        }
        if (!prevCardRequirementsMet) {
            meetsAllRequirements = false;
        }

        confirmFusionSelectionButton.disabled = !meetsAllRequirements;

        // 各ボタンのグレーアウト/選択状態更新
        fusionCardOptionsContainer.querySelectorAll('.fusion-card-option').forEach(button => {
            const cardId = button.dataset.cardId;
            const currentCount = getCardPlayCount(cardId);
            const selectedCount = selectedSourceCards[cardId] || 0;

            if (selectedCount > 0) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }

            // 選択可能な上限を超えている、または現在のプレイ枚数が0で選択されていない
            if (currentCount <= selectedCount && selectedCount > 0) { // すでに選択されている枚数がプレイ枚数と同等以上
                // 何もしない（selected状態が維持される）
            } else if (currentCount === 0 && selectedCount === 0) { // プレイ枚数が0で、まだ選択されていない
                button.classList.add('disabled');
            } else if (currentCount > selectedCount) { // まだ選択可能
                button.classList.remove('disabled');
            }
        });

        fusionTokenOptionsContainer.querySelectorAll('.fusion-token-option').forEach(button => {
            const tokenType = button.dataset.tokenType;
            const currentTokenCount = (tokenType === 'past_core') ? pastCoreTotal : futureCoreTotal;
            const selectedCount = (tokenType === 'past_core') ? selectedSourceTokens.past_core : selectedSourceTokens.future_core;

            if (selectedCount > 0) {
                button.classList.add('selected');
            } else {
                button.classList.remove('selected');
            }

            if (currentTokenCount <= selectedCount && selectedCount > 0) { // 現在の総数を超えて選択できない
                // 何もしない
            } else if (currentTokenCount === 0 && selectedCount === 0) { // トークンが0枚でまだ選択されていない
                button.classList.add('disabled');
            }
            else if (currentTokenCount > selectedCount) { // まだ選択可能
                button.classList.remove('disabled');
            }
        });
    }

    // 融合実行関数 (モーダルで選択された後)
    function executeFusionAction() {
        const targetCardData = currentTargetCardData;

        // 必須トークンコストの消費
        pastCoreTotal -= targetCardData.pastCoreCost;
        futureCoreTotal -= targetCardData.futureCoreCost;

        // 任意のトークン消費分を実際に減らす
        pastCoreTotal -= selectedSourceTokens.past_core;
        futureCoreTotal -= selectedSourceTokens.future_core;
        
        // 前段階カードのプレイカウントを減らす
        // selectedSourceCards に基づいて減算 (融合元としてユーザーが選択したカード)
        for (const cardId in selectedSourceCards) {
            const countToConsume = selectedSourceCards[cardId];
            if (countToConsume > 0) {
                cardCounts[cardId] = (cardCounts[cardId] - countToConsume + 4) % 4;
                updateCardCountDisplay(cardId);
            }
        }
        
        // イクシードΩの場合の特別な前段階カード消費（デストロイ3種）
        if (targetCardData.id === "card18") {
            // イクシードΩはα,β,γ各1枚消費なので、選択されたものが何であれ、これら3枚を消費する
            // (checkFusionConditionsForSource で既にチェック済み)
            // selectedSourceCards に"card15", "card16", "card17"のいずれかが選択されていればOK
            // なので、実際にはここで3枚とも消費する
            // ★ここはselectedSourceCardsで処理済みなので不要
            /*
            cardCounts["card15"] = (cardCounts["card15"] - 1 + 4) % 4;
            cardCounts["card16"] = (cardCounts["card16"] - 1 + 4) % 4;
            cardCounts["card17"] = (cardCounts["card17"] - 1 + 4) % 4;
            updateCardCountDisplay("card15");
            updateCardCountDisplay("card16");
            updateCardCountDisplay("card17");
            */
        } 
        // デストロイアーティファクトα, β, γ の場合
        // ★デストロイγはselectedSourceCardsで処理済みなので、ここも不要
        /*
        else if (["card15", "card16", "card17"].includes(targetCardData.id)) { 
            cardCounts[selectedSourceCardId] = (cardCounts[selectedSourceCardId] - 1 + 4) % 4;
            updateCardCountDisplay(selectedSourceCardId);
        }
        */

        // トークン総量がマイナスにならないように最小値を0に設定
        pastCoreTotal = Math.max(0, pastCoreTotal);
        futureCoreTotal = Math.max(0, futureCoreTotal);

        // 融合されたカード（targetCardId）のプレイカウントを増やす
        cardCounts[targetCardData.id] = (cardCounts[targetCardData.id] + 1) % 4;

        // UIを更新
        updateCardCountDisplay(targetCardData.id);
        updateTotalTokenDisplay();
        hideFusionModal();
    }


    // カードがクリックされたときの処理 (トークン生成系カード用)
    function handleCardClick(clickedButton) {
        const cardId = clickedButton.id;
        const oldCardCount = cardCounts[cardId];
        const newCardCount = (oldCardCount + 1) % 4;

        const requiredPastCore = parseInt(clickedButton.dataset.pastCoreCost || '0', 10);
        const requiredFutureCore = parseInt(clickedButton.dataset.futureCoreCost || '0', 10);
        const requiredAnyCore = parseInt(clickedButton.dataset.anyCoreCost || '0', 10);
        const gainPastCore = parseInt(clickedButton.dataset.pastCoreGain || '0', 10);
        const gainFutureCore = parseInt(clickedButton.dataset.futureCoreGain || '0', 10);

        let nextPastCoreTotal = pastCoreTotal;
        let nextFutureCoreTotal = futureCoreTotal;

        if (oldCardCount === 3 && newCardCount === 0) {
            nextPastCoreTotal -= (gainPastCore * oldCardCount);
            nextFutureCoreTotal -= (gainFutureCore * oldCardCount);
            nextPastCoreTotal += (requiredPastCore * oldCardCount);
            nextFutureCoreTotal += (requiredFutureCore * oldCardCount);
            
            let tempAnyCoreToRestore = requiredAnyCore * oldCardCount;
             while(tempAnyCoreToRestore > 0) {
                if (nextPastCoreTotal < pastCoreTotal && nextPastCoreTotal <= nextFutureCoreTotal) {
                    nextPastCoreTotal++;
                } else if (nextFutureCoreTotal < futureCoreTotal && nextFutureCoreTotal < nextPastCoreTotal) {
                    nextFutureCoreTotal++;
                } else {
                    break;
                }
                tempAnyCoreToRestore--;
            }
            restorePreviousCardCounts(clickedButton, oldCardCount);
            
        } else {
            let tempPastCoreTotal = nextPastCoreTotal;
            let tempFutureCoreTotal = nextFutureCoreTotal;

            tempPastCoreTotal -= requiredPastCore;
            tempFutureCoreTotal -= requiredFutureCore;

            let tempAnyCore = requiredAnyCore;
            while (tempAnyCore > 0) {
                if (tempPastCoreTotal > 0 && tempPastCoreTotal >= tempFutureCoreTotal) {
                    tempPastCoreTotal--;
                } else if (tempFutureCoreTotal > 0) {
                    tempFutureCoreTotal--;
                } else {
                    alert(`「${clickedButton.dataset.cardName}」をプレイするには、トークンが足りません。\n必要なトークン: パスト・コア ${requiredPastCore}, フューチャー・コア ${requiredFutureCore}, 任意のトークン ${requiredAnyCore}\n現在のトークン: パスト・コア ${pastCoreTotal}, フューチャー・コア ${futureCoreTotal}`);
                    return;
                }
                tempAnyCore--;
            }

            if (tempPastCoreTotal < 0 || tempFutureCoreTotal < 0 || tempAnyCore > 0) {
                alert(`「${clickedButton.dataset.cardName}」をプレイするには、トークンが足りません。\n必要なトークン: パスト・コア ${requiredPastCore}, フューチャー・コア ${requiredFutureCore}, 任意のトークン ${requiredAnyCore}\n現在のトークン: パスト・コア ${pastCoreTotal}, フューチャー・コア ${futureCoreTotal}`);
                return;
            }

            const prevCardCostMet = checkPreviousCardCosts(clickedButton);
            if (!prevCardCostMet) {
                if (clickedButton.dataset.prevCardCost || clickedButton.dataset.prevCardCost2 || clickedButton.dataset.prevCardCost3) { 
                    alert(`「${clickedButton.dataset.cardName}」をプレイするには、特定のカードが足りません。`);
                    return;
                }
            }
            
            nextPastCoreTotal = tempPastCoreTotal;
            nextFutureCoreTotal = tempFutureCoreTotal;
            nextPastCoreTotal += gainPastCore;
            nextFutureCoreTotal += gainFutureCore;
        }

        pastCoreTotal = Math.max(0, nextPastCoreTotal);
        futureCoreTotal = Math.max(0, nextFutureCoreTotal);
        cardCounts[cardId] = newCardCount;
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
            img.src = IMAGE_BASE_PATH + tokenImageBaseNames.past_core;
            img.alt = `パスト・コア`;
            pastCoreDisplay.appendChild(img);
        }

        futureCoreDisplay.innerHTML = '';
        for (let i = 0; i < futureCoreTotal; i++) {
            const img = document.createElement('img');
            img.src = IMAGE_BASE_PATH + tokenImageBaseNames.future_core;
            img.alt = `フューチャー・コア`;
            futureCoreDisplay.appendChild(img);
        }
    }

    // 特定のカードがプレイされているかチェックするヘルパー関数
    function getCardPlayCount(cardId) {
        return cardCounts[cardId] || 0;
    }

    // 前段階のカードプレイコストをチェックする関数 (プレイ時用)
    function checkPreviousCardCosts(clickedButton) {
        // イクシードアーティファクトΩ の特別なチェック (card18)
        if (clickedButton.id === "card18") { 
            const destroyAlphaCount = getCardPlayCount("card15"); 
            const destroyBetaCount = getCardPlayCount("card16"); 
            const destroyGammaCount = getCardPlayCount("card17");

            if (destroyAlphaCount >= 1 && destroyBetaCount >= 1 && destroyGammaCount >= 1) {
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
            for (let i = 0; i < prevCardCost; i++) {
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
    function restorePreviousCardCounts(clickedButton, oldCardCount) {
        if (clickedButton.id === "card18") {
            for (let i = 0; i < oldCardCount; i++) {
                cardCounts["card15"] = (cardCounts["card15"] + 1) % 4;
                cardCounts["card16"] = (cardCounts["card16"] + 1) % 4;
                cardCounts["card17"] = (cardCounts["card17"] + 1) % 4;
            }
            updateCardCountDisplay("card15");
            updateCardCountDisplay("card16");
            updateCardCountDisplay("card17");
            return;
        }
        
        const prevCardCost = parseInt(clickedButton.dataset.prevCardCost || '0', 10);
        const prevCardIds = clickedButton.dataset.prevCardIds ? clickedButton.dataset.prevCardIds.split(',') : [];

        if (prevCardCost === 0) {
            return;
        }

        for (let j = 0; j < oldCardCount; j++) {
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
            cardCounts[cardId] = 0;
            updateCardCountDisplay(cardId);
        });

        pastCoreTotal = 0;
        futureCoreTotal = 0;
        updateTotalTokenDisplay();
    }

    // アプリを初期化する
    initializeApp();
});