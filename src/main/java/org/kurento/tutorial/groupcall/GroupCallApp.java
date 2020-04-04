package org.kurento.tutorial.groupcall;

import com.github.openjson.JSONArray;
import com.github.openjson.JSONObject;
import org.apache.openmeetings.core.data.whiteboard.WhiteboardCache;
import org.apache.openmeetings.db.dao.file.FileItemDao;
import org.apache.openmeetings.db.dto.room.Whiteboard;
import org.apache.openmeetings.db.dto.room.Whiteboards;
import org.apache.openmeetings.db.entity.file.BaseFileItem;
import org.apache.openmeetings.db.entity.file.FileItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Map;
import java.util.Properties;

import static spark.Spark.*;
import static spark.Spark.init;


public class GroupCallApp {
  private static final Logger log = LoggerFactory.getLogger(GroupCallApp.class);

  public static String PARAM_OBJ = "obj";

  static int port;
  static String host;
  static int maxThreads = 16;

  static boolean authPass;
  public static String redisHost = "127.0.0.1";
  public static int redisPort = 6379;
  public static String redisPassword = "";
  public static int redisDB = 0;


  static UserRegistry registry;
  static RoomManager roomManager;

  static FileItemDao fileItemDao;

  public static void main(String[] args) {
    if (args.length == 0) {
      log.info("no config file, exit app");
      return;
    }

    try (InputStream input = new FileInputStream(args[0])) {
      Properties props = new Properties();
      props.load(input);

      port = Integer.parseInt(props.getProperty("server.port", "0"));
      host = props.getProperty("server.host");
      maxThreads = Integer.parseInt(props.getProperty("server.max-threads", "16"));
      authPass = Boolean.parseBoolean(props.getProperty("auth.pass", "false"));
      redisHost = props.getProperty("redis.host", "127.0.0.1");
      redisPort = Integer.parseInt(props.getProperty("redis.port", "6379"));
      redisPassword = props.getProperty("redis.password", "");
      redisDB = Integer.parseInt(props.getProperty("redis.db", "0"));
    } catch (IOException ex) {
      ex.printStackTrace();
      log.info("read config file failure:" + ex);
      return;
    }

    log.info("Application started with command-line arguments: {}", Arrays.toString(args));
    log.info("max threads:{}", maxThreads);
    log.info("auth pass:{}", authPass);
    log.debug("redis host:{} port:{} password:{} db:{}",
            redisHost, redisPort, redisPassword, redisDB);


    registry = new UserRegistry();
    roomManager = new RoomManager();
    fileItemDao = new FileItemDao();
    if (host != null) {
      ipAddress(host);
    }
    if (port != 0) {
      port(port);
    }
    threadPool(maxThreads);

    staticFiles.location("/static"); //index.html is served at localhost:4567 (default port)

    webSocket("/wb", CallHandler.class);

    get("/whiteboards", (request, response) -> {
      String room = request.queryParams("room");

      log.info("get whiteboards:{}", room);
      if (room == null || room.length() == 0)  {
        JSONObject resp = new JSONObject();
        return resp.toString();
      }

      Room roomObj = roomManager.getRoom(room);
      if (roomObj == null) {
        JSONObject resp = new JSONObject();
        return resp.toString();
      }

      Long roomId = roomObj.getRoomID();
      long langId = 0;

      JSONArray array = new JSONArray();
      Whiteboards wbs = WhiteboardCache.get(roomId);
      for (Map.Entry<Long, Whiteboard> entry : WhiteboardCache.list(roomId, langId)) {
        Whiteboard wb = entry.getValue();
        log.info("whiteboard id: {}", wb.getId());

        JSONObject wbObj = CallHandler.getAddWbJson(wb);
        JSONArray arr = new JSONArray();
        for (JSONObject o : wb.list()) {
          arr.put(addFileUrl(o));
        }
        wbObj.put(PARAM_OBJ, arr);
        array.put(wbObj);
      }

      JSONObject resp = new JSONObject();
      resp.put("activeId", wbs.getActiveWb());
      if (wbs.get(wbs.getActiveWb()) != null) {
        resp.put("slide", wbs.get(wbs.getActiveWb()).getSlide());
      }
      resp.put("whiteboards", array);

      log.info("whiteboards:{}", resp.toString());
      return resp.toString();
    });
    init();
  }

  public static JSONObject addFileUrl(JSONObject _file) {
    final long fid = _file.optLong("fileId", -1);
    if (fid != -1) {
      FileItem fi = fileItemDao.get(fid);
      if (fi == null) {
        return _file;
      }
      return addFileUrl(_file, fi);
    }
    return _file;
  }

  public static JSONObject addFileUrl(JSONObject _file, BaseFileItem fi) {
    String src;
    switch (fi.getType()) {
      case Video:
      case Recording:
        break;
      case Presentation:
        src = "/files/" + fi.getHash();
        _file.put("_src", src);
        _file.put("deleted", !fi.exists());
        break;
      default:
        src = "/files/" + fi.getHash();
        _file.put("src", src);
        break;
    }
    return _file;
  }


}
