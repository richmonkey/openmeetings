package org.kurento.tutorial.groupcall;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.MalformedURLException;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

import com.github.openjson.JSONArray;
import com.github.openjson.JSONObject;
import org.apache.openmeetings.core.data.file.FileProcessor;
import org.apache.openmeetings.core.data.whiteboard.WhiteboardCache;
import org.apache.openmeetings.db.dao.file.FileItemDao;
import org.apache.openmeetings.db.dto.room.Whiteboard;
import org.apache.openmeetings.db.dto.room.Whiteboards;
import org.apache.openmeetings.db.entity.file.BaseFileItem;
import org.apache.openmeetings.db.entity.file.FileItem;
import org.apache.openmeetings.util.OmFileHelper;
import org.apache.openmeetings.util.process.ConverterProcessResult;
import org.apache.openmeetings.util.process.ConverterProcessResultList;
import static org.apache.openmeetings.db.dto.room.Whiteboard.ITEMS_KEY;

import org.apache.commons.codec.binary.Base64;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.core.io.UrlResource;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import javax.imageio.ImageIO;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map.Entry;
import java.util.function.Function;
import java.io.ByteArrayOutputStream;



@RestController
public class WhiteboardController {
    private static final Logger log = LoggerFactory.getLogger(WhiteboardController.class);

    private static final int UPLOAD_WB_LEFT = 0;
    private static final int UPLOAD_WB_TOP = 0;
    private static final int DEFAULT_WIDTH = 640;
    private static final int DEFAULT_HEIGHT = 480;

    public static final String PARAM_OBJ = "obj";

    @Autowired
    private ApplicationContext appContext;

    @Autowired
    private RoomManager roomManager;

    @Autowired
    private FileItemDao fileItemDao;

    @RequestMapping("/greeting")
    public String greeting(@RequestParam(value="name", defaultValue="World") String name) {
        //test api
        return "HelloWorld";
    }

    @RequestMapping("/whiteboards")
    public String whiteboards(@RequestParam(value="room", required=true) String id) {
        Long roomId = Long.parseLong(id);
        long langId = 0;

        JSONArray array = new JSONArray();
        Whiteboards wbs = WhiteboardCache.get(roomId);
        for (Entry<Long, Whiteboard> entry : WhiteboardCache.list(roomId, langId)) {
            Whiteboard wb = entry.getValue();
            JSONObject wbObj = getAddWbJson(wb);
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
        return resp.toString();
    }

    //todo
    @RequestMapping("/whiteboards/{id:.+}")
    public void save(@RequestParam(value="room", required=true) String room, @PathVariable String id) {
        try{
            PDDocument doc = new PDDocument();
            JSONArray arr = new JSONArray();
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
            baos.toByteArray();
            //todo return baos
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PostMapping("/files")
    public String handleFileUpload(@RequestParam("file") MultipartFile file, @RequestParam(value="room") String roomName) {
        FileItem f = new FileItem();
        f.setSize(file.getSize());
        f.setName(file.getName());
        long uid = 0;
        f.setOwnerId(uid);
        f.setInsertedBy(uid);
        try {
            ConverterProcessResultList logs = appContext.getBean(FileProcessor.class).processFile(f, file.getInputStream());
            for (Entry<String, ConverterProcessResult> entry : logs.getJobs().entrySet()) {
                ConverterProcessResult r = entry.getValue();
                log.info("Adding log: {}, {}, {}", entry.getValue().getProcess(), f, r);
            }
        } catch (Exception e) {
            e.printStackTrace();
            JSONObject resp = new JSONObject();
            resp.put("error", e.getMessage());
            return resp.toString();
        }

        sendFileToWb(f, Long.parseLong(roomName), false);

        JSONObject resp = new JSONObject();
        resp.put("success", true);
        return resp.toString();
    }

    @GetMapping("/files/{filehash:.+}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filehash,
                                              @RequestParam(value="slide", required=false) String slide) {

        log.info("slide: {}", slide);
        Integer s = null;
        if (slide != null) {
            s = Integer.parseInt(slide);
        }

        Resource file = loadAsResource(filehash, s);
        if (file == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"" + file.getFilename() + "\"").body(file);
    }

    public Path load(String filehash) {
        Path rootLocation = Paths.get(OmFileHelper.getUploadFilesDir().getAbsolutePath());
        return rootLocation.resolve(filehash).resolve(filehash + ".jpg");
    }

    public Path loadSlide(String filehash, int slide) {
        Path rootLocation = Paths.get(OmFileHelper.getUploadFilesDir().getAbsolutePath());
        String page = String.format("page-%04d.png", slide);
        return rootLocation.resolve(filehash).resolve(page);
    }

    public Resource loadAsResource(String filehash, Integer slider) {
        try {
            Path file;
            if (slider == null) {
                file = load(filehash);
            } else {
                file = loadSlide(filehash, slider);
            }

            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                log.warn("Could not read file:{} {} ", filehash, file);
                return null;
            }
        }
        catch (MalformedURLException e) {
            return null;
        }
    }

    private static JSONObject getAddWbJson(final Whiteboard wb) {
        return new JSONObject().put("wbId", wb.getId())
                .put("name", wb.getName())
                .put("width", wb.getWidth())
                .put("height", wb.getHeight())
                .put("zoom", wb.getZoom())
                .put("zoomMode", wb.getZoomMode());
    }


    public void sendFileToWb(final BaseFileItem fi, long roomId, boolean clean) {
        Room room = roomManager.getRoom(roomId);
        Whiteboards wbs = WhiteboardCache.get(roomId);
        String wuid = UUID.randomUUID().toString();
        Whiteboard wb = wbs.get(wbs.getActiveWb());
        switch (fi.getType()) {
            case Folder:
                //do nothing
                break;
            case WmlFile:
                break;
            case PollChart:
                break;
            default:
            {
                JSONObject file = new JSONObject()
                        .put("fileId", fi.getId())
                        .put("fileType", fi.getType().name())
                        .put("count", fi.getCount())
                        .put("type", "image")
                        .put("left", UPLOAD_WB_LEFT)
                        .put("top", UPLOAD_WB_TOP)
                        .put("width", fi.getWidth() == null ? DEFAULT_WIDTH : fi.getWidth())
                        .put("height", fi.getHeight() == null ? DEFAULT_HEIGHT : fi.getHeight())
                        .put("uid", wuid)
                        .put("slide", wb.getSlide())
                        ;
                if (FileItem.Type.Video == fi.getType() || FileItem.Type.Recording == fi.getType()) {
                    file.put("type", "video");
                    file.put("status", new JSONObject()
                            .put("paused", true)
                            .put("pos", 0.0)
                            .put("updated", System.currentTimeMillis()));
                }
                final String ruid = wbs.getUid();
                if (clean) {
                    clearAll(roomId, wb.getId());
                }
                wb.put(wuid, file);
                updateWbSize(wb, fi);
                WhiteboardCache.update(roomId, wb);

                room.sendWbAll(WbAction.setSize, getAddWbJson(wb));

                sendWbFile(""+roomId, wb.getId(), ruid, file, fi);
            }
            break;
        }
    }

    public JSONObject addFileUrl(JSONObject _file) {
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

    public JSONObject addFileUrl(JSONObject _file, BaseFileItem fi) {
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

    public  void sendWbFile(String roomName, long wbId, String ruid, JSONObject file, BaseFileItem fi) {
        Room room = roomManager.getRoom(roomName);
        JSONObject fileObj = addFileUrl(file, fi);
        JSONObject obj = new JSONObject();
        obj.put("wbId", wbId);
        obj.put("obj", fileObj);
        room.sendWbAll(WbAction.createObj, obj);
    }


    private static void updateWbSize(Whiteboard wb, final BaseFileItem fi) {
        int w = fi.getWidth() == null ? DEFAULT_WIDTH : fi.getWidth();
        int h = fi.getHeight() == null ? DEFAULT_HEIGHT : fi.getHeight();
        wb.setWidth(Math.max(wb.getWidth(), w));
        wb.setHeight(Math.max(wb.getHeight(), h));
    }

    private void clearAll(Long roomId, long wbId) {
        Room room = roomManager.getRoom(roomId);

        Whiteboard wb = WhiteboardCache.get(roomId).get(wbId);
        if (wb == null) {
            return;
        }
        JSONArray arr = getArray(wb.toJson(), null);
        if (arr.length() != 0) {
            room.addUndo(wb.getId(), new UndoObject(UndoObject.Type.remove, arr));
        }
        wb = WhiteboardCache.clear(roomId, wbId);
        room.sendWbAll(WbAction.clearAll, new JSONObject().put("wbId", wbId));
        room.sendWbAll(WbAction.setSize, getAddWbJson(wb));
    }

    private static JSONArray getArray(JSONObject wb, Function<JSONObject, JSONObject> postprocess) {
        JSONObject items = wb.getJSONObject(ITEMS_KEY);
        JSONArray arr = new JSONArray();
        for (String uid : items.keySet()) {
            JSONObject o = items.getJSONObject(uid);
            if (postprocess != null) {
                o = postprocess.apply(o);
            }
            arr.put(o);
        }
        return arr;
    }

}
