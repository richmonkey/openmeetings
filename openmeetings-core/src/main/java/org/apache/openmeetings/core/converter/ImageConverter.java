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
package org.apache.openmeetings.core.converter;

import static org.apache.openmeetings.util.OmFileHelper.DOC_PAGE_PREFIX;
import static org.apache.openmeetings.util.OmFileHelper.EXTENSION_JPG;
import static org.apache.openmeetings.util.OmFileHelper.EXTENSION_PNG;
import static org.apache.openmeetings.util.OmFileHelper.JPG_MIME_TYPE;
import static org.apache.openmeetings.util.OmFileHelper.PNG_MIME_TYPE;
import static org.apache.openmeetings.util.OmFileHelper.getUploadProfilesUserDir;
import static org.apache.openmeetings.util.OmFileHelper.profileFileName;
import static org.apache.openmeetings.util.OpenmeetingsVariables.CONFIG_DOCUMENT_DPI;
import static org.apache.openmeetings.util.OpenmeetingsVariables.CONFIG_DOCUMENT_QUALITY;
import static org.apache.openmeetings.util.OpenmeetingsVariables.webAppRootKey;
import static org.apache.openmeetings.util.process.ConverterProcessResult.ZERO;
import static org.apache.tika.metadata.HttpHeaders.CONTENT_TYPE;

import java.io.File;
import java.io.FileFilter;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

import org.apache.commons.io.FileUtils;
import org.apache.openmeetings.db.dao.user.UserDao;
import org.apache.openmeetings.db.entity.file.BaseFileItem;
import org.apache.openmeetings.db.entity.file.FileItem;
import org.apache.openmeetings.db.entity.user.User;
import org.apache.openmeetings.util.OmFileHelper;
import org.apache.openmeetings.util.StoredFile;
import org.apache.openmeetings.util.process.ConverterProcessResult;
import org.apache.openmeetings.util.process.ConverterProcessResultList;
import org.apache.openmeetings.util.process.ProcessHelper;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TIFF;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.parser.Parser;
import org.apache.tika.parser.image.ImageParser;
import org.red5.logging.Red5LoggerFactory;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.xml.sax.helpers.DefaultHandler;

@Component
public class ImageConverter extends BaseConverter {
	private static final Logger log = Red5LoggerFactory.getLogger(ImageConverter.class, webAppRootKey);
	private static final String PAGE_TMPLT = DOC_PAGE_PREFIX + "-%04d." + EXTENSION_PNG;


	public ConverterProcessResultList convertImage(BaseFileItem f, StoredFile sf) throws IOException {
		ConverterProcessResultList returnMap = new ConverterProcessResultList();

		File jpg = f.getFile(EXTENSION_JPG);
		if (!sf.isJpg()) {
			File img = f.getFile(sf.getExt());

			log.debug("##### convertImage destinationFile: " + jpg);
			returnMap.addItem("processJPG", convertSingleJpg(img, jpg));
		}
		returnMap.addItem("get JPG dimensions", initSize(f, jpg, JPG_MIME_TYPE));
		return returnMap;
	}


	private String getDpi() {
		return  "150";
	}

	private String getQuality() {
		return "90";
	}

	private static ConverterProcessResult initSize(BaseFileItem f, File img, String mime) {
		ConverterProcessResult res = new ConverterProcessResult();
		res.setProcess("get image dimensions :: " + f.getId());
		final Parser parser = new ImageParser();
		try (InputStream is = new FileInputStream(img)) {
			Metadata metadata = new Metadata();
			metadata.set(CONTENT_TYPE, mime);
			parser.parse(is, new DefaultHandler(), metadata, new ParseContext());
			f.setWidth(Integer.valueOf(metadata.get(TIFF.IMAGE_WIDTH)));
			f.setHeight(Integer.valueOf(metadata.get(TIFF.IMAGE_LENGTH)));
			res.setExitCode(ZERO);
		} catch (Exception e) {
			log.error("Error while getting dimensions", e);
			res.setError("Error while getting dimensions");
			res.setException(e.getMessage());
			res.setExitCode(-1);
		}
		return res;
	}

	/**
	 * @param in - input file
	 * @param out - output file
	 * @return - conversion result
	 * @throws IOException
	 *
	 */
	private ConverterProcessResult convertSingleJpg(File in, File out) throws IOException {
		String[] argv = new String[] { getPathToConvert(), in.getCanonicalPath(), out.getCanonicalPath() };

		return ProcessHelper.executeScript("convertSingleJpg", argv);
	}

	public ConverterProcessResult resize(File in, File out, Integer width, Integer height) throws IOException {
		String[] argv = new String[] { getPathToConvert()
				, "-resize", (width == null ? "" : width) + (height == null ? "" : "x" + height)
				, in.getCanonicalPath(), out.getCanonicalPath()
				};
		return ProcessHelper.executeScript("resize", argv);
	}

	/**
	 * Converts PDF document to the series of images
	 *
	 * @param pdf - input PDF document
	 * @return - result of conversion
	 * @throws IOException in case IO exception occurred
	 */
	public ConverterProcessResultList convertDocument(ConverterProcessResultList list, FileItem f, File pdf) throws IOException {
		log.debug("convertDocument");
		String[] argv = new String[] {
			getPathToConvert()
			, "-density", getDpi()
			, pdf.getCanonicalPath()
			, "-quality", getQuality()
			, new File(pdf.getParentFile(), PAGE_TMPLT).getCanonicalPath()
			};
		ConverterProcessResult res = ProcessHelper.executeScript("convertDocument", argv);
		list.addItem("convert PDF to images", res);
		if (res.isOk()) {
			File[] pages = pdf.getParentFile().listFiles(new FileFilter() {
				@Override
				public boolean accept(File f) {
					return f.isFile() && f.getName().startsWith(DOC_PAGE_PREFIX) && f.getName().endsWith(EXTENSION_PNG);
				}
			});
			if (pages == null || pages.length == 0) {
				f.setCount(0);
			} else {
				f.setCount(pages.length);
				list.addItem("get PNG page dimensions", initSize(f, pages[0], PNG_MIME_TYPE));
			}
		}
		return list;
	}
}
