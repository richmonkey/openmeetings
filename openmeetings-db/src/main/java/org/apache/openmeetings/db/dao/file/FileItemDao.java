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
package org.apache.openmeetings.db.dao.file;


import java.io.File;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;


import org.apache.openmeetings.db.entity.file.BaseFileItem;
import org.apache.openmeetings.db.entity.file.BaseFileItem.Type;
import org.apache.openmeetings.db.entity.file.FileItem;
import org.apache.openmeetings.db.entity.user.Group;
import org.apache.openmeetings.util.OmFileHelper;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;




public class FileItemDao {
	private final AtomicLong counter = new AtomicLong();

	HashMap<Long, FileItem> files = new HashMap<>();
	private static final Logger log = LoggerFactory.getLogger(FileItemDao.class);

	public FileItem add(String fileName, Long parentId, Long ownerId, Long roomId, Long insertedBy,
			Type type, String externalId, String externalType) {
		log.debug(".add(): adding file " + fileName + " roomID: " + roomId);
		try {
			FileItem fileItem = new FileItem();
			fileItem.setName(fileName);
			fileItem.setHash(UUID.randomUUID().toString());
			fileItem.setDeleted(false);
			fileItem.setParentId(parentId);
			fileItem.setOwnerId(ownerId);
			fileItem.setRoomId(roomId);
			fileItem.setInserted(new Date());
			fileItem.setInsertedBy(insertedBy);
			fileItem.setType(type);
			fileItem.setUpdated(new Date());
			fileItem.setExternalId(externalId);
			fileItem.setExternalType(externalType);
			long id = counter.incrementAndGet();
			fileItem.setId(id);

			files.put(id, fileItem);
			log.debug(".add(): file " + fileName + " added as " + fileItem.getId());
			return fileItem;
		} catch (Exception ex2) {
			log.error(".add(): ", ex2);
		}
		return null;
	}

	public List<FileItem> getByRoomAndOwner(Long roomId, Long ownerId) {
		return null;
	}

	public List<FileItem> getByRoom(Long roomId) {
		log.debug("getByRoom roomId :: " + roomId);
		return null;
	}

	public List<FileItem> getByOwner(Long ownerId) {
		log.debug("getByOwner() started");
		return null;
	}

	public List<FileItem> getByGroup(Long groupId) {
		log.debug("getByGroup() started");
		return null;
	}

	public List<FileItem> getByGroup(Long groupId, List<Type> filter) {
		return null;
	}

	public List<FileItem> getByParent(Long parentId) {
		log.debug("getByParent() started");
		return null;
	}

	public List<FileItem> getByParent(Long parentId, List<Type> filter) {
		return null;
	}

	public FileItem getByHash(String hash) {
		log.debug("getByHash() started");
		return null;
	}

	public FileItem get(Long id) {
        if (files.containsKey(id)) {
            return files.get(id);
        } else {
            return null;
        }
	}

	public FileItem get(String externalId, String externalType) {
		FileItem f = null;
		log.debug("get started");
		return f;
	}

	public List<FileItem> get() {
		log.debug("get started");

		return null;
	}

	public void delete(FileItem f) {
		f.setDeleted(true);
		f.setUpdated(new Date());

		update(f);
	}

	public void delete(String externalId, String externalType) {
		log.debug("delete started");

		delete(get(externalId, externalType));
	}

	/**
	 * @param id
	 * @param name
	 */
	public FileItem rename(Long id, String name) {
		log.debug("rename started");

		FileItem f = get(id);
		if (f == null) {
			return null;
		}
		f.setName(name);
		return update(f);
	}

	public FileItem update(FileItem f) {
		if (f.getId() == null) {
			f.setInserted(new Date());
            long id = counter.incrementAndGet();
            f.setId(id);
            files.put(id, f);
		} else {
			f.setUpdated(new Date());
            files.put(f.getId(), f);
		}
		return f;
	}

	private void updateChilds(FileItem f) {
		for (FileItem child : getByParent(f.getId())) {
			child.setOwnerId(f.getOwnerId());
			child.setRoomId(f.getRoomId());
			update(child);
			if (Type.Folder == f.getType()) {
				updateChilds(child);
			}
		}
	}

	/**
	 * @param id
	 * @param parentId
	 * @param isOwner
	 * @param roomId
	 */
	public FileItem move(long id, long parentId, long ownerId, long roomId) {
		log.debug(".move() started");

		FileItem f = get(id);
		if (f == null) {
			return null;
		}

		if (parentId < 0) {
			if (parentId == -1) {
				// move to personal Folder
				f.setOwnerId(ownerId);
				f.setRoomId(null);
			} else {
				// move to public room folder
				f.setOwnerId(null);
				f.setRoomId(roomId);
			}
			f.setParentId(null);
		} else {
			f.setParentId(parentId);
			f.setOwnerId(null);
		}
		if (Type.Folder == f.getType()) {
			updateChilds(f);
		}
		return update(f);
	}

	public List<BaseFileItem> getAllRoomFiles(String search, int start, int count, Long roomId/*, Long ownerId*/, List<Group> groups) {
		return null;
	}

	public List<BaseFileItem> get(Collection<String> ids) {
		return null;
	}

	public long getOwnSize(Long userId) {
		return getSize(getByOwner(userId));
	}

	public long getRoomSize(Long roomId) {
		return getSize(getByRoom(roomId));
	}

	public long getSize(List<FileItem> list) {
		long size = 0;
		for (FileItem f : list) {
			size += getSize(f);
		}
		return size;
	}

	public long getSize(FileItem f) {
		long size = 0;
		try {
			if (f.exists()) {
				File base = OmFileHelper.getUploadFilesDir();
				switch (f.getType()) {
					case Image:
					case Presentation:
					case Video:
						File tFolder = new File(base, f.getHash());

						if (tFolder.exists()) {
							size += OmFileHelper.getSize(tFolder);
						}
						break;
					default:
						// TODO check other types
						break;
				}
			}
			if (Type.Folder == f.getType()) {
				for (FileItem child : getByParent(f.getId())) {
					size += getSize(child);
				}
			}
		} catch (Exception err) {
			log.error("[getSize] ", err);
		}
		return size;
	}
}
