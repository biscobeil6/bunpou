中3 国語文法アプリ ― 分割管理版・敬語最終磨き込み
================================================

構成
・index.html        画面構造
・style.css         見た目・iPadレイアウト
・app.js            アプリ動作
・data.js           全747問
・lecture-data.js   文法資料80項目

敬語30問
・同じ「普通語 → 同じ敬語」の単純重複をなくして再設計
・元の普通語が異なる場合は同じ敬語でも残しています
  例：いる／行く／来る → いらっしゃる
・読む→お読みになる、待つ→お待ちになる、
  会う→お目にかかる、参る、存じる等を追加
・最後3問は複数表現を組み合わせた総合問題

文法資料
・講義用80項目を内蔵
・トップの「文法資料」から参照できます


Apple Pencil安定化
・iPad Safariの文字選択／コピー／長押しメニューを手書き欄で抑止
・pointerイベントをpassive:falseで処理
・pointer captureを使用して、欄内でのストローク継続性を改善
・coalesced eventsに対応し、速い筆記時の線切れを軽減


Version
・トップページに「Version 6 / Apple Pencil調整版」を常時表示
・更新版へ切り替わったかを視覚的に確認できます


Version 7 / Pencil入力強化版
・トップにVersion 7表示
・手書き欄右下に入力判定（pen / touch / mouse）を表示
・Safariがpointer captureを失ってもwindow側でストローク追跡
・selectionchange時に文字選択を解除
・touch/gesture/contextmenu/selectstart/dragstartを手書き欄で抑止


VERSION 9 / Pencil実入力確認版
・Safari/GitHub Pagesの旧ファイルキャッシュを避けるため、
  外部ファイル名そのものをV9専用に変更
  style-v9.css / app-v9.js / data-v9.js / lecture-data-v9.js
・トップと問題画面にV9を表示
・手書き欄右下：
  読込直後「V9 JS読込済 / Pencil待機」
  入力開始時「V9 input: pen 入力中」等へ変化
・表示が変われば、V9のapp.jsが確実に実行されています


VERSION 10 / 社会アプリ手書き移植版
・ユーザーのiPadで実際に書きやすかった
  「社会暗記アプリ v3.2 iPad手書き再修正版」の入力方式を移植
・Pointer Events と Touch Events を両方待ち受け
・Apple PencilがTouch Eventsのstylusとして届く場合にも対応
・pointerrawupdate対応
・Pointer / Touchの二重発火は開始座標と時間で重複除外
・pointerdownが欠落してもpenのmoveからストローク復帰
・coalesced events対応
・Safariのselectstart / dragstart / gesturestart / contextmenuを抑止
・トップと問題画面にV10を表示
