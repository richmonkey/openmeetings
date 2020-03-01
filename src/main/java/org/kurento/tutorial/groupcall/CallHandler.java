/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License") +  you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.kurento.tutorial.groupcall;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

import com.github.openjson.JSONArray;
import com.github.openjson.JSONObject;
import org.apache.commons.codec.binary.Base64;
import org.apache.openmeetings.core.data.whiteboard.WhiteboardCache;
import org.apache.openmeetings.db.dto.room.Whiteboard;
import org.apache.openmeetings.db.entity.file.BaseFileItem;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.eclipse.jetty.websocket.api.Session;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketClose;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketConnect;
import org.eclipse.jetty.websocket.api.annotations.OnWebSocketMessage;
import org.eclipse.jetty.websocket.api.annotations.WebSocket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import redis.clients.jedis.Jedis;

import javax.imageio.ImageIO;

import static org.apache.openmeetings.db.dto.room.Whiteboard.ITEMS_KEY;


@WebSocket
public class CallHandler {

  private static final Logger log = LoggerFactory.getLogger(CallHandler.class);

  private static final Gson gson = new GsonBuilder().create();

  public static boolean authPass;//不校验token
  public static String redisHost;
  public static int redisPort;
  public static String redisPassword;
  public static int redisDB;


  private RoomManager roomManager;


  private UserRegistry registry;

    @OnWebSocketConnect
    public void onConnect(Session user) throws Exception {
        log.info("connection established:", user.getRemoteAddress());

        authPass = GroupCallApp.authPass;
        redisHost = GroupCallApp.redisHost;
        redisPort = GroupCallApp.redisPort;
        redisPassword = GroupCallApp.redisPassword;
        redisDB = GroupCallApp.redisDB;

        registry = GroupCallApp.registry;
        roomManager = GroupCallApp.roomManager;
    }



    @OnWebSocketClose
    public void onClose(Session session, int statusCode, String reason) {
        log.info("connection closed:", statusCode, reason);
        try {
            if (registry.getBySession(session) != null) {
                UserSession user = registry.removeBySession(session);
                leaveRoom(user);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @OnWebSocketMessage
    public void onMessage(Session user, String message) {
        handleTextMessage(user, message);
    }

    public void handleTextMessage(Session session, String message) {
        log.info("handle text message...:" + message);


        try {
            final JsonObject jsonMessage = gson.fromJson(message, JsonObject.class);
            final UserSession user = registry.getBySession(session);

            if (user != null) {
                log.debug("Incoming message from user '{}': {}", user.getName(), jsonMessage);
            } else {
                log.debug("Incoming message from new user: {}", jsonMessage);
            }

            String id = jsonMessage.get("id").getAsString();
            switch (id) {
                case "joinRoom":
                    joinRoom(jsonMessage, session);
                    break;
                case "leaveRoom":
                    leaveRoom(user);
                    break;
                case "ping":
                    break;
                case "createWb":
                case "removeWb":
                case "resetWb":
                case "activateWb":
                case "setSlide":
                case "createObj":
                case "modifyObj":
                case "deleteObj":
                case "clearAll":
                case "clearSlide":
                case "save":
                case "load":
                case "undo":
                case "setSize":
                case "setBackground":
                case "downloadPdf":
                case "startRecording":
                case "stopRecording":
                case "videoStatus":
                case "loadVideos":
                    try {
                        WbAction a = WbAction.valueOf(jsonMessage.get("id").getAsString());
                        JSONObject jobj;
                        if (jsonMessage.has("obj")) {
                            String s = jsonMessage.get("obj").getAsString();
                            jobj = new JSONObject(s);
                        } else {
                            jobj = new JSONObject();
                        }
                        processWbAction(user, a, jobj);
                    } catch (IllegalArgumentException e) {
                        e.printStackTrace();
                    }
                    break;
                default:
                    log.warn("unknown action id:" + id);
                    break;
            }
        } catch (Exception e){
            e.printStackTrace();
            log.info("handle message exception:" + e);
        }
  }


  private boolean auth(String token, String name) {
    Jedis jedis = new Jedis(redisHost, redisPort);
    if (redisPassword != null && redisPassword.length() > 0) {
      jedis.auth(redisPassword);
    }
    if (redisDB > 0) {
      jedis.select(redisDB);
    }

    String key = "access_token_" + token;
    String userID = jedis.hget(key, "user_id");
    if (!name.equals(userID)) {
      log.info("token {} invalid", token);
      return false;
    }
    return true;
  }


  private void joinRoom(JsonObject params, Session session) throws IOException {
    final String roomName = params.get("room").getAsString();
    final String name = params.get("name").getAsString();
    log.info("PARTICIPANT {}: trying to join room {}", name, roomName);

    if (!authPass) {
      if (!params.has("token")) {
        log.info("need token");
        return;
      }
      String token = params.get("token").getAsString();
      if (!auth(token, name)) {
        return;
      }
    }

    Room room = roomManager.getRoom(roomName);
    final UserSession user = room.join(name, session);
    registry.register(user);
  }

  private void leaveRoom(UserSession user) throws IOException {
    final Room room = roomManager.getRoom(user.getRoomName());
    room.leave(user);
    if (room.getParticipants().isEmpty()) {
      roomManager.removeRoom(room);
    }
  }

    private void sendWbOthers(UserSession user, WbAction a, JSONObject obj) {
        final Room room = roomManager.getRoom(user.getRoomName());
        room.sendWbOthers(user, a, obj);
    }

    private void sendWbAll(UserSession user, WbAction a, JSONObject obj) {
        final Room room = roomManager.getRoom(user.getRoomName());
        room.sendWbAll(a, obj);
    }

    private void addUndo(UserSession user, Long wbId, UndoObject u) {
        if (wbId == null) {
            return;
        }
        final Room room = roomManager.getRoom(user.getRoomName());
        room.addUndo(wbId, u);

    }

    private UndoObject getUndo(UserSession user, Long wbId) {
        final Room room = roomManager.getRoom(user.getRoomName());
        return room.getUndo(wbId);
    }

    protected void processWbAction(UserSession user, WbAction a, JSONObject obj) throws IOException {
        long langId = 0;
        final Room room = roomManager.getRoom(user.getRoomName());
        long roomId = room.getRoomID();
        switch (a) {
            case createObj:
            case modifyObj:
            {
                JSONObject o = obj.optJSONObject("obj");
                if (o != null && "pointer".equals(o.getString("type"))) {
                    sendWbOthers(user, a, obj);
                    return;
                }
            }
            break;
            case downloadPdf:
            {
                try (PDDocument doc = new PDDocument()) {
                    JSONArray arr = obj.getJSONArray("slides");
                    for (int i = 0; i < arr.length(); ++i) {
                        String base64Image = arr.getString(i).split(",")[1];
                        byte[] bb = Base64.decodeBase64(base64Image);
                        BufferedImage img = ImageIO.read(new ByteArrayInputStream(bb));
                        float width = img.getWidth();
                        float height = img.getHeight();
                        PDPage page = new PDPage(new PDRectangle(width, height));
                        PDImageXObject pdImageXObject = LosslessFactory.createFromImage(doc, img);
                        try (PDPageContentStream contentStream = new PDPageContentStream(doc, page, PDPageContentStream.AppendMode.APPEND, false)) {
                            contentStream.drawImage(pdImageXObject, 0, 0, width, height);
                        }
                        doc.addPage(page);
                    }
                    ByteArrayOutputStream baos = new ByteArrayOutputStream();
                    doc.save(baos);
                    //rp.startDownload(target, baos.toByteArray());
                }

                return;
            }
            case loadVideos:
            {
                StringBuilder sb = new StringBuilder("WbArea.initVideos(");
                JSONArray arr = new JSONArray();

                for (Map.Entry<Long, Whiteboard> entry : WhiteboardCache.list(roomId, langId)) {
                    Whiteboard wb = entry.getValue();
                    for (JSONObject o : wb.list()) {
                        String ft = o.optString("fileType");
                        if (BaseFileItem.Type.Recording.name().equals(ft) || BaseFileItem.Type.Video.name().equals(ft)) {
                            JSONObject _sts = o.optJSONObject("status");
                            if (_sts == null) {
                                continue;
                            }
                            JSONObject sts = new JSONObject(_sts.toString()); //copy
                            sts.put("pos", sts.getDouble("pos") + (System.currentTimeMillis() - sts.getLong("updated")) * 1. / 1000);
                            arr.put(new JSONObject()
                                    .put("wbId", wb.getId())
                                    .put("uid", o.getString("uid"))
                                    .put("slide", o.getString("slide"))
                                    .put("status", sts));
                        }
                    }
                }
                sb.append(arr.toString()).append(");");

                return;
            }
            default:
                break;
        }


        switch (a) {
            case createWb:
            {
                int width = obj.optInt("width", -1);
                int height = obj.optInt("height", -1);
                String background = obj.optString("background");
                String name = obj.optString("name");
                Whiteboard wb = WhiteboardCache.add(roomId, langId);
                if (width != -1) {
                    wb.setWidth(width);
                }
                if (height != -1) {
                    wb.setHeight(height);
                }
                if (background != null) {
                    wb.setBackground(background);
                }
                if (name != null) {
                    wb.setName(name);
                }
                sendWbAll(user, WbAction.createWb, getAddWbJson(wb));
            }
            break;
            case removeWb:
            {
                long _id = obj.optLong("wbId", -1);
                Long id = _id < 0 ? null : _id;
                WhiteboardCache.remove(roomId, id);
                sendWbAll(user, WbAction.removeWb, obj);
            }
            break;
            case resetWb:
            {
                long _id = obj.optLong("wbId", -1);
                Long wbId = _id < 0 ? null : _id;
                Whiteboard wb = WhiteboardCache.get(roomId).get(wbId);
                if (wb == null) {
                    return;
                }
                WhiteboardCache.clear(roomId, wbId);
                sendWbAll(user, WbAction.clearAll, new JSONObject().put("wbId", wbId));
            }
            break;
            case activateWb:
            {
                long _id = obj.optLong("wbId", -1);
                WhiteboardCache.activate(roomId, _id);
                sendWbAll(user, WbAction.activateWb, obj);
            }
            break;
            case setSlide:
            {
                Whiteboard wb = WhiteboardCache.get(roomId).get(obj.getLong("wbId"));
                wb.setSlide(obj.optInt("slide", 0));
                WhiteboardCache.update(roomId, wb);
                sendWbOthers(user, WbAction.setSlide, obj);
            }
            break;
            case clearAll:
            {
                clearAll(user, roomId, obj.getLong("wbId"));
            }
            break;
            case setSize:
            {
                Whiteboard wb = WhiteboardCache.get(roomId).get(obj.getLong("wbId"));
                wb.setZoom(obj.getDouble("zoom"));
                wb.setZoomMode(Whiteboard.ZoomMode.valueOf(obj.getString("zoomMode")));
                WhiteboardCache.update(roomId, wb);
                sendWbOthers(user, WbAction.setSize, getAddWbJson(wb));
                //TODO scroll????
            }
            break;
            case setBackground:
            {
                Whiteboard wb = WhiteboardCache.get(roomId).get(obj.getLong("wbId"));
                wb.setBackground(obj.getString("background"));
                WhiteboardCache.update(roomId, wb);
                sendWbOthers(user, WbAction.setBackground, obj);
            }
            break;
            case createObj:
            {
                Whiteboard wb = WhiteboardCache.get(roomId).get(obj.getLong("wbId"));
                JSONObject o = obj.getJSONObject("obj");
                wb.put(o.getString("uid"), o);
                WhiteboardCache.update(roomId, wb);
                addUndo(user, wb.getId(), new UndoObject(UndoObject.Type.add, o));
                sendWbOthers(user, WbAction.createObj, obj);
            }
            break;
            case modifyObj:
            {
                Whiteboard wb = WhiteboardCache.get(roomId).get(obj.getLong("wbId"));
                JSONArray arr = obj.getJSONArray("obj");
                JSONArray undo = new JSONArray();
                for (int i = 0; i < arr.length(); ++i) {
                    JSONObject _o = arr.getJSONObject(i);
                    String uid = _o.getString("uid");
                    JSONObject po = wb.get(uid);
                    if (po != null) {
                        undo.put(po);
                        wb.put(uid, _o);
                    }
                }
                if (arr.length() != 0) {
                    WhiteboardCache.update(roomId, wb);
                    addUndo(user, wb.getId(), new UndoObject(UndoObject.Type.modify, undo));
                }
                sendWbOthers(user, WbAction.modifyObj, obj);
            }
            break;
            case deleteObj:
            {
                Whiteboard wb = WhiteboardCache.get(roomId).get(obj.getLong("wbId"));
                JSONArray arr = obj.getJSONArray("obj");
                JSONArray undo = new JSONArray();
                for (int i = 0; i < arr.length(); ++i) {
                    JSONObject _o = arr.getJSONObject(i);
                    JSONObject u = wb.remove(_o.getString("uid"));
                    if (u != null) {
                        undo.put(u);
                    }
                }
                if (undo.length() != 0) {
                    WhiteboardCache.update(roomId, wb);
                    addUndo(user, wb.getId(), new UndoObject(UndoObject.Type.remove, undo));
                }
                sendWbAll(user, WbAction.deleteObj, obj);
            }
            break;
            case clearSlide:
            {
                Whiteboard wb = WhiteboardCache.get(roomId).get(obj.getLong("wbId"));
                JSONArray arr = wb.clearSlide(obj.getInt("slide"));
                if (arr.length() != 0) {
                    WhiteboardCache.update(roomId, wb);
                    addUndo(user, wb.getId(), new UndoObject(UndoObject.Type.remove, arr));
                }
                sendWbAll(user, WbAction.clearSlide, obj);
            }
            break;
            case save:
                //todo api
                //wb2save = obj.getLong("wbId");
                //fileName.open(target);
                break;
            case undo:
            {
                Long wbId = obj.getLong("wbId");
                UndoObject uo = getUndo(user, wbId);
                if (uo != null) {
                    Whiteboard wb = WhiteboardCache.get(roomId).get(wbId);
                    switch (uo.getType()) {
                        case add:
                        {
                            JSONObject o = new JSONObject(uo.getObject());
                            wb.remove(o.getString("uid"));
                            WhiteboardCache.update(roomId, wb);
                            sendWbAll(user, WbAction.deleteObj, obj.put("obj", new JSONArray().put(o)));
                        }
                        break;
                        case remove:
                        {
                            JSONArray arr = new JSONArray(uo.getObject());
                            for (int i  = 0; i < arr.length(); ++i) {
                                JSONObject o = arr.getJSONObject(i);
                                wb.put(o.getString("uid"), o);
                            }
                            WhiteboardCache.update(roomId, wb);
                            sendWbAll(user, WbAction.createObj, obj.put("obj", new JSONArray(uo.getObject())));
                        }
                        break;
                        case modify:
                        {
                            JSONArray arr = new JSONArray(uo.getObject());
                            for (int i  = 0; i < arr.length(); ++i) {
                                JSONObject o = arr.getJSONObject(i);
                                wb.put(o.getString("uid"), o);
                            }
                            WhiteboardCache.update(roomId, wb);
                            sendWbAll(user, WbAction.modifyObj, obj.put("obj", arr));
                        }
                        break;
                    }
                }
            }
            break;
            case videoStatus:
            {
                Whiteboard wb = WhiteboardCache.get(roomId).get(obj.getLong("wbId"));
                String uid = obj.getString("uid");
                JSONObject po = wb.get(uid);
                if (po != null && "video".equals(po.getString("type"))) {
                    JSONObject ns = obj.getJSONObject("status");
                    po.put("status", ns.put("updated", System.currentTimeMillis()));
                    WhiteboardCache.update(roomId, wb.put(uid, po));
                    obj.put("slide", po.getInt("slide"));
                    sendWbAll(user, WbAction.videoStatus, obj);
                }
            }
            break;
            default:
                break;
        }
    }

    private static JSONArray getArray(JSONObject wb) {
        JSONObject items = wb.getJSONObject(ITEMS_KEY);
        JSONArray arr = new JSONArray();
        for (String uid : items.keySet()) {
            JSONObject o = items.getJSONObject(uid);
            arr.put(o);
        }
        return arr;
    }

    private void clearAll(UserSession user, Long roomId, long wbId) {
        Whiteboard wb = WhiteboardCache.get(roomId).get(wbId);
        if (wb == null) {
            return;
        }

        JSONArray arr = wb.listItems();
        if (arr.length() != 0) {
            addUndo(user, wb.getId(), new UndoObject(UndoObject.Type.remove, arr));
        }
        WhiteboardCache.clear(roomId, wbId);
        sendWbAll(user, WbAction.clearAll, new JSONObject().put("wbId", wbId));
    }


    private static JSONObject getAddWbJson(final Whiteboard wb) {
        return new JSONObject().put("wbId", wb.getId())
                .put("name", wb.getName())
                .put("width", wb.getWidth())
                .put("height", wb.getHeight())
                .put("zoom", wb.getZoom())
                .put("zoomMode", wb.getZoomMode())
                .put("background", wb.getBackground());
    }

}
