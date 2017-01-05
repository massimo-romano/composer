/*
 * IBM Confidential
 * OCO Source Materials
 * IBM Concerto - Blockchain Solution Framework
 * Copyright IBM Corp. 2016
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has
 * been deposited with the U.S. Copyright Office.
 */

'use strict';

const Logger = require('@ibm/ibm-concerto-common').Logger;
const Resource = require('@ibm/ibm-concerto-common').Resource;

const LOG = Logger.getLog('IdentityManager');

/**
 * A class for managing and persisting identities.
 * @protected
 */
class IdentityManager {

    /**
     * Constructor.
     * @param {DataService} dataService The data service to use.
     * @param {RegistryManager} registryManager The registry manager to use.
     */
    constructor(dataService, registryManager) {
        this.dataService = dataService;
        this.registryManager = registryManager;
    }

    /**
     * Add a new mapping for the specified identity (user ID) to the specified
     * participant.
     * @param {(Resource|string)} participant The participant, or the unique
     * identifier of the participant.
     * @param {string} userID The identity (user ID) to map to the participant.
     * @return {Promise} A promise that is resolved when a new mapping for the
     * specified identity has been created.
     */
    addIdentityMapping(participant, userID) {
        const method = 'addIdentityMapping';
        LOG.entry(method, participant, userID);
        let participantFQI, participantFQT, participantID;
        if (participant instanceof Resource) {
            participantFQI = participant.getFullyQualifiedIdentifier();
            participantFQT = participant.getFullyQualifiedType();
            participantID = participant.getIdentifier();
        } else {
            participantFQI = participant;
            let hashIndex = participantFQI.indexOf('#');
            if (hashIndex === -1) {
                throw new Error('Invalid fully qualified participant identifier');
            }
            participantFQT = participantFQI.substring(0, hashIndex);
            participantID = participantFQI.substring(hashIndex + 1);
        }
        LOG.debug(method, 'Looking for participant registry', participantFQT);
        return this.registryManager.get('Participant', participantFQT)
            .then((participantRegistry) => {
                LOG.debug(method, 'Found participant registry, looking for participant', participantID);
                return participantRegistry.get(participantID);
            })
            .then((participant) => {
                LOG.debug(method, 'Found participant, getting $sysidentities collection');
                return this.dataService.getCollection('$sysidentities');
            })
            .then((sysidentities) => {
                LOG.debug(method, 'Got $sysidentities collection, checking for existing mapping');
                return sysidentities.exists(userID)
                    .then((exists) => {
                        if (exists) {
                            LOG.error(method, 'Found an existing mapping for user ID', userID);
                            throw new Error(`Found an existing mapping for user ID '${userID}'`);
                        }
                        LOG.debug(method, 'No existing mapping exists for user ID, adding');
                        return sysidentities.add(userID, {
                            participant: participantFQI
                        });
                    });
            })
            .then(() => {
                LOG.exit(method);
            });
    }

    /**
     * Remove an existing mapping for the specified identity (user ID) to a
     * participant.
     * @param {string} userID The identity (user ID).
     * @return {Promise} A promise that is resolved when a new mapping for the
     * specified identity has been created.
     */
    removeIdentityMapping(userID) {
        const method = 'removeIdentityMapping';
        LOG.entry(method, userID);
        LOG.debug(method, 'Getting $sysidentities collection');
        return this.dataService.getCollection('$sysidentities')
            .then((sysidentities) => {
                LOG.debug(method, 'Got $sysidentities collection, checking for existing mapping');
                return sysidentities.exists(userID)
                    .then((exists) => {
                        if (!exists) {
                            LOG.debug('No existing mapping exists for user ID, ignoring');
                            return;
                        }
                        return sysidentities.remove(userID);
                    });
            })
            .then(() => {
                LOG.exit(method);
            });
    }

    /**
     * Retrieve the participant for the specified identity (user ID).
     * @param {string} userID The identity (user ID).
     * @return {Promise} A promise that is resolved with a {@link Resource}
     * representing the participant, or rejected with an error.
     */
    getParticipant(userID) {
        const method = 'getParticipant';
        LOG.entry(method, userID);
        LOG.debug(method, 'Getting $sysidentities collection');
        let participantFQI, participantFQT, participantID;
        return this.dataService.getCollection('$sysidentities')
            .then((sysidentities) => {
                LOG.debug(method, 'Got $sysidentities collection, checking for existing mapping');
                return sysidentities.get(userID);
            })
            .then((mapping) => {
                participantFQI = mapping.participant;
                LOG.debug(method, 'Found mapping, participant is', participantFQI);
                let hashIndex = participantFQI.indexOf('#');
                if (hashIndex === -1) {
                    throw new Error('Invalid fully qualified participant identifier');
                }
                participantFQT = participantFQI.substring(0, hashIndex);
                participantID = participantFQI.substring(hashIndex + 1);
                LOG.debug(method, 'Looking for participant registry', participantFQT);
                return this.registryManager.get('Participant', participantFQT);
            })
            .then((participantRegistry) => {
                LOG.debug(method, 'Found participant registry, looking for participant', participantID);
                return participantRegistry.get(participantID);
            })
            .then((participant) => {
                LOG.exit(method, participant);
                return participant;
            });
    }

}

module.exports = IdentityManager;
