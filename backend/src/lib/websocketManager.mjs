<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>اختبار WebSocket</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }

        h1 {
            color: #667eea;
            margin-bottom: 30px;
            text-align: center;
        }

        .status {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: bold;
            text-align: center;
        }

        .status.connected {
            background: #10b981;
            color: white;
        }

        .status.disconnected {
            background: #ef4444;
            color: white;
        }

        .controls {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }

        button {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            background: #667eea;
            color: white;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
        }

        button:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        button:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }

        .input-group {
            margin-bottom: 15px;
        }

        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
        }

        input:focus {
            outline: none;
            border-color: #667eea;
        }

        .messages {
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
            max-height: 400px;
            overflow-y: auto;
            margin-top: 20px;
        }

        .message {
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 6px;
            border-left: 4px solid #667eea;
            background: white;
        }

        .message.error {
            border-left-color: #ef4444;
            background: #fee;
        }

        .message.success {
            border-left-color: #10b981;
            background: #efe;
        }

        .timestamp {
            font-size: 12px;
            color: #6b7280;
            margin-top: 5px;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }

        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }

        .stat-value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .stat-label {
            font-size: 14px;
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 اختبار WebSocket المتقدم</h1>

        <div id="status" class="status disconnected">
            غير متصل
        </div>

        <div class="controls">
            <button onclick="connect()">🔌 اتصال</button>
            <button onclick="disconnect()">🔌 قطع الاتصال</button>
            <button onclick="authenticate()">🔐 مصادقة</button>
            <button onclick="getStats()">📊 الإحصائيات</button>
            <button onclick="getRooms()">🏠 قائمة الغرف</button>
            <button onclick="clearMessages()">🗑️ مسح الرسائل</button>
        </div>

        <div class="input-group">
            <input type="text" id="roomId" placeholder="معرف الغرفة" value="room_test">
        </div>

        <div class="controls">
            <button onclick="joinRoom()">👥 انضم للغرفة</button>
            <button onclick="leaveRoom()">👋 غادر الغرفة</button>
            <button onclick="broadcastMessage()">📢 بث رسالة</button>
        </div>

        <div class="input-group">
            <input type="text" id="streamId" placeholder="معرف البث" value="stream_test">
        </div>

        <div class="controls">
            <button onclick="subscribeStream()">📺 اشترك في البث</button>
            <button onclick="unsubscribeStream()">📺 إلغاء الاشتراك</button>
            <button onclick="sendTaskUpdate()">📊 تحديث مهمة</button>
        </div>

        <div class="stats" id="stats">
            <div class="stat-card">
                <div class="stat-value" id="clientCount">0</div>
                <div class="stat-label">عملاء متصلين</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="roomCount">0</div>
                <div class="stat-label">غرف نشطة</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="messageCount">0</div>
                <div class="stat-label">رسائل مستلمة</div>
            </div>
        </div>

        <div class="messages" id="messages">
            <div class="message">
                <strong>مرحباً!</strong> اضغط على "اتصال" للبدء
                <div class="timestamp">جاهز للاختبار</div>
            </div>
        </div>
    </div>

    <script>
        let ws = null;
        let clientId = null;
        let messageCount = 0;

        function connect() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                addMessage('⚠️ أنت متصل بالفعل', 'error');
                return;
            }

            const wsUrl = 'ws://localhost:3000/ws';
            addMessage(`🔌 جاري الاتصال بـ ${wsUrl}...`);

            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                updateStatus(true);
                addMessage('✅ تم الاتصال بنجاح!', 'success');
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleMessage(data);
                } catch (error) {
                    addMessage(`❌ خطأ في تحليل الرسالة: ${error.message}`, 'error');
                }
            };

            ws.onerror = (error) => {
                addMessage(`❌ خطأ في الاتصال: ${error}`, 'error');
            };

            ws.onclose = () => {
                updateStatus(false);
                addMessage('🔌 تم قطع الاتصال', 'error');
            };
        }

        function disconnect() {
            if (ws) {
                ws.close();
                ws = null;
                clientId = null;
            }
        }

        function handleMessage(data) {
            messageCount++;
            document.getElementById('messageCount').textContent = messageCount;

            switch (data.type) {
                case 'connected':
                    clientId = data.clientId;
                    addMessage(`🎉 معرف العميل: ${clientId}`, 'success');
                    break;

                case 'authenticated':
                    addMessage(`✅ تمت المصادقة: ${data.userId}`, 'success');
                    break;

                case 'room_joined':
                    addMessage(`👥 انضممت إلى الغرفة: ${data.roomId} (${data.memberCount} أعضاء)`, 'success');
                    break;

                case 'room_left':
                    addMessage(`👋 غادرت الغرفة: ${data.roomId}`, 'success');
                    break;

                case 'user_joined':
                    addMessage(`👤 انضم مستخدم: ${data.userId}`, 'success');
                    break;

                case 'user_left':
                    addMessage(`👋 غادر مستخدم: ${data.userId}`, 'success');
                    break;

                case 'stats':
                    updateStats(data.data);
                    addMessage('📊 تم تحديث الإحصائيات', 'success');
                    break;

                case 'rooms_list':
                    addMessage(`🏠 الغرف النشطة: ${data.count}`, 'success');
                    data.rooms.forEach(room => {
                        addMessage(`  - ${room.id}: ${room.memberCount} أعضاء`);
                    });
                    break;

                case 'error':
                    addMessage(`❌ ${data.error.title}: ${data.error.message}`, 'error');
                    break;

                case 'pong':
                    addMessage('🏓 Pong!');
                    break;

                default:
                    addMessage(`📨 ${data.type}: ${JSON.stringify(data).substring(0, 100)}`);
            }
        }

        function sendMessage(data) {
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                addMessage('❌ غير متصل! اضغط على "اتصال" أولاً', 'error');
                return false;
            }

            ws.send(JSON.stringify(data));
            return true;
        }

        function authenticate() {
            sendMessage({
                type: 'authenticate',
                token: 'test_token_' + Date.now(),
                credentials: {
                    userId: 'user_test_' + Math.random().toString(36).substr(2, 9)
                }
            });
        }

        function joinRoom() {
            const roomId = document.getElementById('roomId').value;
            if (!roomId) {
                addMessage('❌ أدخل معرف الغرفة', 'error');
                return;
            }
            sendMessage({
                type: 'join_room',
                roomId
            });
        }

        function leaveRoom() {
            const roomId = document.getElementById('roomId').value;
            sendMessage({
                type: 'leave_room',
                roomId
            });
        }

        function broadcastMessage() {
            const roomId = document.getElementById('roomId').value;
            sendMessage({
                type: 'broadcast',
                roomId,
                data: {
                    message: 'مرحباً من العميل!',
                    timestamp: new Date()
                }
            });
        }

        function subscribeStream() {
            const streamId = document.getElementById('streamId').value;
            sendMessage({
                type: 'stream_subscribe',
                streamId
            });
        }

        function unsubscribeStream() {
            const streamId = document.getElementById('streamId').value;
            sendMessage({
                type: 'stream_unsubscribe',
                streamId
            });
        }

        function sendTaskUpdate() {
            sendMessage({
                type: 'task_update',
                data: {
                    taskId: 'task_' + Date.now(),
                    progress: Math.floor(Math.random() * 100),
                    status: 'running',
                    message: 'اختبار تحديث المهمة'
                }
            });
        }

        function getStats() {
            sendMessage({ type: 'get_stats' });
        }

        function getRooms() {
            sendMessage({ type: 'get_rooms' });
        }

        function updateStatus(connected) {
            const statusEl = document.getElementById('status');
            if (connected) {
                statusEl.className = 'status connected';
                statusEl.textContent = '✅ متصل';
            } else {
                statusEl.className = 'status disconnected';
                statusEl.textContent = '❌ غير متصل';
            }
        }

        function updateStats(stats) {
            document.getElementById('clientCount').textContent = stats.totalClients || 0;
            document.getElementById('roomCount').textContent = stats.totalRooms || 0;
        }

        function addMessage(text, type = '') {
            const messagesEl = document.getElementById('messages');
            const messageEl = document.createElement('div');
            messageEl.className = 'message ' + type;
            
            const timestamp = new Date().toLocaleTimeString('ar-SA');
            messageEl.innerHTML = `
                <strong>${text}</strong>
                <div class="timestamp">${timestamp}</div>
            `;
            
            messagesEl.appendChild(messageEl);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        function clearMessages() {
            document.getElementById('messages').innerHTML = '';
            messageCount = 0;
            document.getElementById('messageCount').textContent = '0';
        }

        // اتصال تلقائي عند تحميل الصفحة
        window.onload = () => {
            addMessage('🚀 جاهز للاختبار! اضغط على "اتصال" للبدء');
        };
    </script>
</body>
</html>