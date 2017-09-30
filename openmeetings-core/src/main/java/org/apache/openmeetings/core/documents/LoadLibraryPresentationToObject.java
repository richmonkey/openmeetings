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
package org.apache.openmeetings.core.documents;

import java.util.Iterator;
import java.util.LinkedList;

import org.apache.openmeetings.db.dto.file.FileItemDTO;
import org.apache.openmeetings.db.dto.file.PresentationObject;
import org.apache.openmeetings.util.OpenmeetingsVariables;
import org.dom4j.Document;
import org.dom4j.Element;
import org.dom4j.io.SAXReader;
import org.red5.logging.Red5LoggerFactory;
import org.slf4j.Logger;

public class LoadLibraryPresentationToObject {
	private static final Logger log = Red5LoggerFactory.getLogger(LoadLibraryPresentationToObject.class, OpenmeetingsVariables.webAppRootKey);

	private static LoadLibraryPresentationToObject instance;

	private LoadLibraryPresentationToObject() {}

	public static synchronized LoadLibraryPresentationToObject getInstance() {
		if (instance == null) {
			instance = new LoadLibraryPresentationToObject();
		}
		return instance;
	}

	public PresentationObject parseLibraryFileToObject(String filePath){
		try {
			PresentationObject lMap = new PresentationObject();

			SAXReader reader = new SAXReader();
			Document document = reader.read(filePath);

			Element root = document.getRootElement();
			Integer k = 0;

			for (Iterator<Element> i = root.elementIterator(); i.hasNext(); ) {
				Element item = i.next();
				log.error(item.getName());

				String nodeVal = item.getName();

					if (nodeVal.equals("originalDocument")){
						lMap.setOriginalDocument(this.createListObjectLibraryByFileDocument(item));
					} else if (nodeVal.equals("pdfDocument")){
						lMap.setPdfDocument(this.createListObjectLibraryByFileDocument(item));
					} else if (nodeVal.equals("swfDocument")) {
						lMap.setSwfDocument(this.createListObjectLibraryByFileDocument(item));
					} else if (nodeVal.equals("thumbs")) {
						lMap.setThumbs(this.createListObjectLibraryByFileDocumentThumbs(item));
					}

				k++;

			}

			return lMap;
		} catch (Exception err) {
			log.error("parseLibraryFileToObject",err);
			return null;
		}
	}

	public FileItemDTO createListObjectLibraryByFileDocument(Element fileElement){
		try {

			log.info("createListObjectLibraryByFileDocument"+fileElement);
			FileItemDTO fileObject = new FileItemDTO();
			fileObject.setName(fileElement.getText());
			//FIXME TODO fileObject.setLastModified(fileElement.attribute("lastmod").getText());
			//FIXME TODO fileObject.setSize(fileElement.attribute("size").getText());
			return fileObject;
		} catch (Exception err) {
			log.error("createListObjectLibraryByFileDocument",err);
		}
		return null;
	}

	public LinkedList<FileItemDTO> createListObjectLibraryByFileDocumentThumbs(Element fileElement){
		try {

			LinkedList<FileItemDTO> thumbMap = new LinkedList<>();

			for (Iterator<Element> i = fileElement.elementIterator(); i.hasNext(); ) {
				Element thumbElement = i.next();
				log.info("createListObjectLibraryByFileDocumentThumbs"+thumbElement);
				FileItemDTO singleThumb = new FileItemDTO();
				singleThumb.setName(thumbElement.getName());
				//FIXME TODO singleThumb.setFileNamePure(thumbElement.getText());
				//FIXME TODO singleThumb.setLastModified(thumbElement.attribute("lastmod").getText());
				//FIXME TODO singleThumb.setSize(thumbElement.attribute("size").getText());
				thumbMap.add(singleThumb);
			}

			return thumbMap;

		} catch (Exception err) {
			log.error("createListObjectLibraryByFileDocumentThumbs",err);
		}
		return null;
	}

}
