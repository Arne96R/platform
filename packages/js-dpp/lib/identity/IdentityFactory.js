const Identity = require('./Identity');
const IdentityPublicKey = require('./IdentityPublicKey');

const IdentityCreateTransition = require('./stateTransition/IdentityCreateTransition/IdentityCreateTransition');
const IdentityTopUpTransition = require('./stateTransition/IdentityTopUpTransition/IdentityTopUpTransition');

const InvalidIdentityError = require('./errors/InvalidIdentityError');
const InstantAssetLockProof = require('./stateTransition/assetLockProof/instant/InstantAssetLockProof');
const ChainAssetLockProof = require('./stateTransition/assetLockProof/chain/ChainAssetLockProof');
const AbstractConsensusError = require('../errors/consensus/AbstractConsensusError');

class IdentityFactory {
  /**
   * @param {DashPlatformProtocol} dpp
   * @param {validateIdentity} validateIdentity
   * @param {decodeProtocolEntity} decodeProtocolEntity
   */
  constructor(
    dpp,
    validateIdentity,
    decodeProtocolEntity,
  ) {
    this.dpp = dpp;
    this.validateIdentity = validateIdentity;
    this.decodeProtocolEntity = decodeProtocolEntity;
  }

  /**
   * Create Identity
   *
   * @param {InstantAssetLockProof} assetLockProof
   * @param {PublicKeyConfig[]} publicKeyConfigs
   * @return {Identity}
   */
  create(assetLockProof, publicKeyConfigs) {
    const identity = new Identity({
      protocolVersion: this.dpp.getProtocolVersion(),
      id: assetLockProof.createIdentifier(),
      balance: 0,
      publicKeys: publicKeyConfigs.map((publicKey, i) => ({
        id: publicKey.id == null ? i : publicKey.id,
        type: publicKey.type == null ? IdentityPublicKey.TYPES.ECDSA_SECP256K1 : publicKey.type,
        purpose: publicKey.purpose == null ? IdentityPublicKey.PURPOSES.AUTHENTICATION
          : publicKey.purpose,
        securityLevel: publicKey.securityLevel == null ? IdentityPublicKey.SECURITY_LEVELS.CRITICAL
          : publicKey.securityLevel,
        // Copy data buffer
        data: publicKey.key.toBuffer(),
      })),
      revision: 0,
    });

    identity.setAssetLockProof(assetLockProof);

    return identity;
  }

  /**
   * Create identity from a plain object
   *
   * @param {RawIdentity} rawIdentity
   * @param [options]
   * @param {boolean} [options.skipValidation]
   * @return {Identity}
   */
  createFromObject(rawIdentity, options = {}) {
    const opts = { skipValidation: false, ...options };

    if (!opts.skipValidation) {
      const result = this.validateIdentity(rawIdentity);

      if (!result.isValid()) {
        throw new InvalidIdentityError(result.getErrors(), rawIdentity);
      }
    }

    return new Identity(rawIdentity);
  }

  /**
   * Create Identity from a Buffer
   *
   * @param {Buffer} buffer
   * @param {Object} options
   * @param {boolean} [options.skipValidation=false]
   * @return {Identity}
   */
  createFromBuffer(buffer, options = {}) {
    let rawIdentity;
    let protocolVersion;

    try {
      [protocolVersion, rawIdentity] = this.decodeProtocolEntity(
        buffer,
      );

      rawIdentity.protocolVersion = protocolVersion;
    } catch (error) {
      if (error instanceof AbstractConsensusError) {
        throw new InvalidIdentityError([error]);
      }

      throw error;
    }

    return this.createFromObject(rawIdentity, options);
  }

  /**
   * Create Instant Asset Lock proof
   *
   * @param {InstantLock} instantLock
   * @param {Transaction} assetLockTransaction
   * @param {number} outputIndex
   * @returns {InstantAssetLockProof}
   */
  createInstantAssetLockProof(instantLock, assetLockTransaction, outputIndex) {
    return new InstantAssetLockProof({
      instantLock: instantLock.toBuffer(),
      transaction: assetLockTransaction.toBuffer(),
      outputIndex,
    });
  }

  /**
   * Create Chain Asset Lock proof
   *
   * @param {number} coreChainLockedHeight
   * @param {Buffer} outPoint
   * @returns {InstantAssetLockProof}
   */
  createChainAssetLockProof(coreChainLockedHeight, outPoint) {
    return new ChainAssetLockProof({
      coreChainLockedHeight,
      outPoint,
    });
  }

  /**
   * Create identity create transition
   *
   * @param {Identity} identity
   * @return {IdentityCreateTransition}
   */
  createIdentityCreateTransition(identity) {
    const stateTransition = new IdentityCreateTransition({
      protocolVersion: this.dpp.getProtocolVersion(),
      assetLockProof: identity.getAssetLockProof().toObject(),
    });

    stateTransition.setPublicKeys(identity.getPublicKeys());

    return stateTransition;
  }

  /**
   * Create identity top up transition
   *
   * @param {Identifier|Buffer|string} identityId - identity to top up
   * @param {InstantAssetLockProof} assetLockProof
   * @return {IdentityTopUpTransition}
   */
  createIdentityTopUpTransition(identityId, assetLockProof) {
    return new IdentityTopUpTransition({
      protocolVersion: this.dpp.getProtocolVersion(),
      identityId,
      assetLockProof: assetLockProof.toObject(),
    });
  }
}

/**
 * @typedef {Object} PublicKeyConfig
 * @property [number|undefined] id
 * @property [number|undefined] type
 * @property [number|undefined] purpose
 * @property [number|undefined] securityLevel
 * @property {PublicKey} key
 */

module.exports = IdentityFactory;
