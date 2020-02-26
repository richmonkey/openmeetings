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

import static org.apache.commons.io.FileUtils.copyFile;
import static org.apache.openmeetings.util.OmFileHelper.EXTENSION_PDF;

import java.io.File;
import org.apache.openmeetings.db.entity.file.FileItem;
import org.apache.openmeetings.util.StoredFile;
import org.apache.openmeetings.util.process.ConverterProcessResult;
import org.apache.openmeetings.util.process.ConverterProcessResultList;
//import org.artofsolving.jodconverter.OfficeDocumentConverter;
//import org.artofsolving.jodconverter.office.DefaultOfficeManagerConfiguration;
//import org.artofsolving.jodconverter.office.OfficeException;
//import org.artofsolving.jodconverter.office.OfficeManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


public class DocumentConverter {
	private static final Logger log = LoggerFactory.getLogger(DocumentConverter.class);


	private ImageConverter imageConverter;

	public ConverterProcessResultList convertPDF(FileItem f, StoredFile sf) throws Exception {
		ConverterProcessResultList result = new ConverterProcessResultList();

		boolean fullProcessing = !sf.isPdf();
		File original = f.getFile(sf.getExt());
		File pdf = f.getFile(EXTENSION_PDF);
		log.debug("fullProcessing: " + fullProcessing);
		if (fullProcessing) {
			log.debug("-- running JOD --");
			result.addItem("processOpenOffice", doJodConvert(original, pdf));
		} else if (!EXTENSION_PDF.equals(sf.getExt())) {
			copyFile(original, pdf);
		}

		log.debug("-- generate page images --");
		return imageConverter.convertDocument(result, f, pdf);
	}

	/**
	 * Generates PDF using JOD Library (external library)
	 */
	public ConverterProcessResult doJodConvert(File in, File out) {
		try {
//			String officePath = "";//todo cfg officepath
//			DefaultOfficeManagerConfiguration configuration = new DefaultOfficeManagerConfiguration();
//			if (officePath != null && officePath.length() > 0) {
//				configuration.setOfficeHome(officePath);
//			}
//			OfficeManager officeManager = configuration.buildOfficeManager();
//			officeManager.start();
//			OfficeDocumentConverter converter = new OfficeDocumentConverter(officeManager);
//			try {
//				converter.convert(in, out);
//			} catch (OfficeException ex) {
//				log.error("doJodConvert", ex);
//				return new ConverterProcessResult("doJodConvert", ex.getMessage(), ex);
//			} finally {
//				officeManager.stop();
//			}
		} catch (Exception ex) {
			log.error("doJodConvert", ex);
			return new ConverterProcessResult("doJodConvert", ex.getMessage(), ex);
		}
		ConverterProcessResult result = new ConverterProcessResult("doJodConvert", "Document converted successfully", null);
		result.setExitCode(0);
		return result;
	}
}
