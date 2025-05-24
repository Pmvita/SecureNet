# Log Source Management
@app.route('/api/logs/sources', methods=['GET'])
@require_api_key
def get_log_sources():
    try:
        sources = db.get_log_sources()
        return jsonify(sources)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/sources', methods=['POST'])
@require_api_key
def create_log_source():
    try:
        source = request.json
        source_id = db.create_log_source(source)
        return jsonify({'id': source_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/sources/<source_id>', methods=['GET'])
@require_api_key
def get_log_source(source_id):
    try:
        source = db.get_log_source(source_id)
        if not source:
            return jsonify({'error': 'Log source not found'}), 404
        return jsonify(source)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/sources/<source_id>', methods=['PUT'])
@require_api_key
def update_log_source(source_id):
    try:
        source = request.json
        if not db.update_log_source(source_id, source):
            return jsonify({'error': 'Log source not found'}), 404
        return jsonify({'message': 'Log source updated'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/sources/<source_id>', methods=['DELETE'])
@require_api_key
def delete_log_source(source_id):
    try:
        if not db.delete_log_source(source_id):
            return jsonify({'error': 'Log source not found'}), 404
        return jsonify({'message': 'Log source deleted'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/logs/sources/<source_id>/toggle', methods=['POST'])
@require_api_key
def toggle_log_source(source_id):
    try:
        if not db.toggle_log_source(source_id):
            return jsonify({'error': 'Log source not found'}), 404
        return jsonify({'message': 'Log source toggled'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Log Ingestion
@app.route('/api/logs/ingest', methods=['POST'])
@require_api_key
def ingest_logs():
    try:
        logs = request.json
        if not isinstance(logs, list):
            logs = [logs]
        
        # Process and store logs
        for log in logs:
            # Validate log format
            if not all(k in log for k in ['timestamp', 'level', 'source', 'message']):
                continue
            
            # Add metadata
            log['id'] = str(uuid.uuid4())
            log['received_at'] = datetime.utcnow().isoformat()
            
            # Store log
            db.store_log(log)
            
            # Broadcast to WebSocket clients
            socketio.emit('log', log)
        
        return jsonify({'message': f'Ingested {len(logs)} logs'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# WebSocket Connection
@socketio.on('connect')
def handle_connect():
    try:
        api_key = request.args.get('api_key')
        if not api_key:
            logger.warning("WebSocket connection attempt without API key")
            return False
        
        if not verify_api_key(api_key):
            logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
            return False
        
        logger.info(f"WebSocket connection established with API key: {api_key[:8]}...")
        return True
    except Exception as e:
        logger.error(f"Error during WebSocket connection: {str(e)}")
        return False

@socketio.on('disconnect')
def handle_disconnect():
    try:
        api_key = request.args.get('api_key')
        if api_key:
            logger.info(f"WebSocket connection closed for API key: {api_key[:8]}...")
    except Exception as e:
        logger.error(f"Error during WebSocket disconnect: {str(e)}")

@socketio.on('error')
def handle_error(error):
    logger.error(f"WebSocket error: {str(error)}")

# API Key Verification
def verify_api_key(api_key):
    """Verify the API key is valid."""
    try:
        # Get API key from environment
        valid_key = os.getenv('API_KEY')
        if not valid_key:
            logger.error("API_KEY not set in environment")
            return False
        
        # Compare keys
        return api_key == valid_key
    except Exception as e:
        logger.error(f"Error verifying API key: {str(e)}")
        return False

# Logging Configuration
import logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Add handler if none exists
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

@app.websocket("/ws/logs")
async def websocket_log_endpoint(websocket: WebSocket):
    try:
        # Get API key from query parameters
        api_key = websocket.query_params.get('api_key')
        if not api_key:
            logger.warning("WebSocket connection attempt without API key")
            await websocket.close(code=4003, reason="API key required")
            return

        # Verify API key
        if api_key != API_KEY:
            logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
            await websocket.close(code=4003, reason="Invalid API key")
            return

        # Accept connection
        await manager.connect(websocket, "logs")
        logger.info(f"WebSocket connection established with API key: {api_key[:8]}...")

        try:
            while True:
                # Keep connection alive and handle any client messages
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            logger.info("WebSocket client disconnected")
        finally:
            manager.disconnect(websocket, "logs")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

@app.websocket("/ws/notifications")
async def websocket_notification_endpoint(websocket: WebSocket):
    try:
        # Get API key from query parameters
        api_key = websocket.query_params.get('api_key')
        if not api_key:
            logger.warning("WebSocket connection attempt without API key")
            await websocket.close(code=4003, reason="API key required")
            return

        # Verify API key
        if api_key != API_KEY:
            logger.warning(f"Invalid API key attempt: {api_key[:8]}...")
            await websocket.close(code=4003, reason="Invalid API key")
            return

        # Accept connection
        await manager.connect(websocket, "notifications")
        logger.info(f"WebSocket notification connection established with API key: {api_key[:8]}...")

        try:
            while True:
                # Keep connection alive and handle any client messages
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            logger.info("WebSocket notification client disconnected")
        finally:
            manager.disconnect(websocket, "notifications")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except:
            pass

# Template middleware
@app.middleware("http")
async def template_middleware(request: Request, call_next):
    response = await call_next(request)
    
    # Only modify HTML responses
    if "text/html" in response.headers.get("content-type", ""):
        # Get the response body
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        
        # Inject API key into template context
        if b"{{ api_key }}" in body:
            body = body.replace(b"{{ api_key }}", API_KEY.encode())
        
        # Create new response with modified body
        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )
    
    return response

# Template setup
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(
        "home.html",
        {"request": request, "api_key": API_KEY}
    )

@app.get("/logs", response_class=HTMLResponse)
async def logs(request: Request):
    return templates.TemplateResponse(
        "logs.html",
        {"request": request, "api_key": API_KEY}
    )

@app.get("/anomalies", response_class=HTMLResponse)
async def anomalies(request: Request):
    return templates.TemplateResponse(
        "anomalies.html",
        {"request": request, "api_key": API_KEY}
    )

@app.get("/network", response_class=HTMLResponse)
async def network(request: Request):
    return templates.TemplateResponse(
        "network.html",
        {"request": request, "api_key": API_KEY}
    )

@app.get("/settings", response_class=HTMLResponse)
async def settings(request: Request):
    return templates.TemplateResponse(
        "settings.html",
        {"request": request, "api_key": API_KEY}
    ) 