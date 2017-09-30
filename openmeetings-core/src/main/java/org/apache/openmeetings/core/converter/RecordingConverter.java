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

import static org.apache.openmeetings.util.OmFileHelper.EXTENSION_FLV;
import static org.apache.openmeetings.util.OmFileHelper.getStreamsHibernateDir;
import static org.apache.openmeetings.util.OpenmeetingsVariables.webAppRootKey;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import org.apache.openmeetings.db.dao.file.FileItemLogDao;
import org.apache.openmeetings.db.dao.record.RecordingDao;
import org.apache.openmeetings.db.dao.record.RecordingMetaDataDao;
import org.apache.openmeetings.db.entity.record.Recording;
import org.apache.openmeetings.db.entity.record.RecordingMetaData;
import org.apache.openmeetings.db.entity.record.RecordingMetaData.Status;
import org.apache.openmeetings.util.OmFileHelper;
import org.apache.openmeetings.util.process.ConverterProcessResult;
import org.apache.openmeetings.util.process.ProcessHelper;
import org.apache.wicket.util.string.Strings;
import org.red5.logging.Red5LoggerFactory;
import org.slf4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class RecordingConverter extends BaseConverter implements IRecordingConverter {
	private static final Logger log = Red5LoggerFactory.getLogger(RecordingConverter.class, webAppRootKey);

	// Spring loaded Beans
	@Autowired
	private RecordingDao recordingDao;
	@Autowired
	private RecordingMetaDataDao metaDataDao;
	@Autowired
	private FileItemLogDao logDao;

	@Override
	public void startConversion(Long id) {
		Recording r = recordingDao.get(id);
		if (r == null) {
			log.warn("Conversion is NOT started. Recording with ID {} is not found", id);
			return;
		}
		try {
			log.debug("recording " + r.getId());

			List<ConverterProcessResult> logs = new ArrayList<>();
			List<File> waveFiles = new ArrayList<>();
			File streamFolder = getStreamFolder(r);

			RecordingMetaData screenMetaData = metaDataDao.getScreenMetaDataByRecording(r.getId());

			if (screenMetaData == null) {
				throw new Exception("screenMetaData is Null recordingId " + r.getId());
			}

			if (screenMetaData.getStreamStatus() == Status.NONE) {
				throw new Exception("Stream has not been started, error in recording");
			}
			if (Strings.isEmpty(r.getHash())) {
				r.setHash(UUID.randomUUID().toString());
			}
			r.setStatus(Recording.Status.CONVERTING);
			r = recordingDao.update(r);



			// Merge Wave to Full Length
			File wav = new File(streamFolder, screenMetaData.getStreamName() + "_FINAL_WAVE.wav");

			if (waveFiles.size() == 1) {
				wav = waveFiles.get(0);
			} else if (waveFiles.size() > 0) {
				String[] argv_full_sox = mergeAudioToWaves(waveFiles, wav);

				logs.add(ProcessHelper.executeScript("mergeAudioToWaves", argv_full_sox));
			} else {
				// create default Audio to merge it. strip to content length
				String oneSecWav = new File(getStreamsHibernateDir(), "one_second.wav").getCanonicalPath();

				// Calculate delta at beginning
				double duration = diffSeconds(r.getRecordEnd(), r.getRecordStart());

				String[] cmd = new String[] { getPathToSoX(), oneSecWav, wav.getCanonicalPath(), "pad", "0", "" + duration };

				logs.add(ProcessHelper.executeScript("generateSampleAudio", cmd));
			}
			screenMetaData.setFullWavAudioData(wav.getName());
			metaDataDao.update(screenMetaData);

			// Merge Audio with Video / Calculate resulting FLV

			String inputScreenFullFlv = new File(streamFolder, OmFileHelper.getName(screenMetaData.getStreamName(), EXTENSION_FLV)).getCanonicalPath();

			// ffmpeg -vcodec flv -qscale 9.5 -r 25 -ar 22050 -ab 32k -s 320x240
			// -i 65318fb5c54b1bc1b1bca077b493a914_28_12_2009_23_38_17_FINAL_WAVE.wav
			// -i 65318fb5c54b1bc1b1bca077b493a914_28_12_2009_23_38_17.flv
			// final1.flv

			int flvWidth = r.getWidth();
			int flvHeight = r.getHeight();

			log.debug("flvWidth -1- " + flvWidth);
			log.debug("flvHeight -1- " + flvHeight);

			flvWidth = Double.valueOf((Math.floor(flvWidth / 16)) * 16).intValue();
			flvHeight = Double.valueOf((Math.floor(flvHeight / 16)) * 16).intValue();

			log.debug("flvWidth -2- " + flvWidth);
			log.debug("flvHeight -2- " + flvHeight);

			r.setWidth(flvWidth);
			r.setHeight(flvHeight);

			String mp4path = convertToMp4(r, Arrays.asList(
					"-itsoffset", formatMillis(diff(screenMetaData.getRecordStart(), r.getRecordStart())),
					"-i", inputScreenFullFlv, "-i", wav.getCanonicalPath()
					), logs);

			convertToPng(r, mp4path, logs);

			updateDuration(r);
			r.setStatus(Recording.Status.PROCESSED);

			logDao.delete(r);
			for (ConverterProcessResult returnMap : logs) {
				logDao.add("generateFFMPEG", r, returnMap);
			}

			// Delete Wave Files
			for (File audio : waveFiles) {
				if (audio.exists()) {
					audio.delete();
				}
			}

		} catch (Exception err) {
			log.error("[startConversion]", err);
			r.setStatus(Recording.Status.ERROR);
		}
		recordingDao.update(r);
	}
}
