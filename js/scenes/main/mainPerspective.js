/**
 * Created by Tiago on 29/04/2015.
 */

CGHLab.MainPerspective = function( mainScene ){

    this.mainScene = mainScene;
    this.views = [ 0, Math.PI/2, Math.PI, (3*Math.PI)/2 ];
    this.currentView = 0;
    this.currentViewName = 1;
    this.lockViewCoords = new THREE.Vector3(0, 500, -350);
    this.lastCameraPosition = new THREE.Vector3();

};

CGHLab.MainPerspective.prototype = {

    constructor: CGHLab.MainPerspective,

    //Transforms a degrees in radians and rotate the object. This function calculates the difference between the actual rotation and the new value
    //of rotation and rotate that value. For example, if the object has a 90� rotation and you want rotate it to 100�, the rotation will be of 10�
    rotateObject: function( value )
    {
        var rad = CGHLab.Helpers.deg2rad(value);
        var r = rad - this.mainScene.objectRotationScene;
        this.mainScene.objectRotationScene += r;
        if ((this.mainScene.objectRotationScene) > 2*Math.PI) this.mainScene.objectRotationScene = this.mainScene.objectRotationScene - 2*Math.PI;
        this.mainScene.object.object.rotateY(r);
        this.mainScene.object.convertToLightPoints();
        this.mainScene.updateShaderUniforms();
    },

    //Change the object
    changeObject: function( value )
    {
        //Changes the object
        this.mainScene.object.changeObject(value);
        this.mainScene.updateShaderUniforms();

        //Deletes the previous object waves
        var objWaveLight = this.mainScene.getObjWaveLight();
        var i;
        for(i = 0; i < objWaveLight.length; i++){
            this.mainScene.scene.remove(objWaveLight[i]);
        }
        this.mainScene.eraseObjLight();
        this.mainScene.collidableList = [];
        this.mainScene.objWaveArrived = false;
        this.mainScene.patternShown = false;
        if(!this.mainScene.interferencePatternInstant) this.mainScene.hideInterferencePattern();
    },

    //Handles the update of the reference wave angle. The position of the mirror and amplifier are updated to match the parameters
    updateMirror: function(value)
    {
        var mirror = this.mainScene.scene.getObjectByName('mirror');
        var amplifier2 = this.mainScene.scene.getObjectByName('amplifier2');

        //Updates the mirror direction and units
        this.mainScene.referenceWaveAngle = CGHLab.Helpers.deg2rad(value);
        var newDirMirror = new THREE.Vector3(Math.sin(this.mainScene.plateRotation + this.mainScene.referenceWaveAngle), 0, Math.cos(this.mainScene.plateRotation + this.mainScene.referenceWaveAngle)).normalize();
        var unitsMirror = (1/Math.cos(Math.PI/4 - this.mainScene.referenceWaveAngle)) * 250;

        //Update the amplifier units
        var unitsAmplifier2 = 200;//(1/Math.cos(Math.PI/4 - this.referenceWaveAngle)) * 200;

        //Make the changes permanent
        this.mainScene.setMirrorDirAndUnits(newDirMirror, unitsMirror, unitsAmplifier2);

        //Updates mirror position with the new mirror direction and units
        this.mainScene.mirrorPosition = new THREE.Vector3();
        this.mainScene.mirrorPosition.addVectors(this.mainScene.platePosition, newDirMirror.normalize().multiplyScalar(unitsMirror));
        mirror.rotateY(-this.mainScene.mirrorRotation);
        //TO_DO: tentar perceber o porque disto... xD
        this.mainScene.mirrorRotation = -Math.PI/2 + this.mainScene.plateRotation - ((Math.PI/4 - this.mainScene.referenceWaveAngle)/2);

        //Update the rotation of the mirror to match parameters
        mirror.position.set(this.mainScene.mirrorPosition.x, this.mainScene.mirrorPosition.y, this.mainScene.mirrorPosition.z);
        mirror.rotateY(this.mainScene.mirrorRotation);
        this.mainScene.updateShaderUniforms();

        //if simple laser is on then it needs to be updated
        if(this.mainScene.simpleLaserOn) {
            var laserM_AP2 = this.mainScene.scene.getObjectByName('simpleMirrorAP2');
            var laserAP2_P = this.mainScene.scene.getObjectByName('simpleAP2Plate');
            laserM_AP2.rotateZ(-this.mainScene.amplifierRotation2);
            laserAP2_P.rotateZ(-this.mainScene.amplifierRotation2);
        }

        //Calculate amplifier position with new mirror direction
        this.mainScene.amplifierPosition2 = new THREE.Vector3();
        this.mainScene.amplifierPosition2.addVectors(this.mainScene.platePosition, newDirMirror.normalize().multiplyScalar(unitsAmplifier2));
        amplifier2.rotateY(-this.mainScene.amplifierRotation2);

        //Calculate amplifier rotation to match rotation of reference wave
        var negDirMirror = newDirMirror.clone().negate().normalize();
        var dirSplitter = this.mainScene.getDirSplitter().clone().normalize();
        var dot = dirSplitter.dot(negDirMirror);
        this.mainScene.amplifierRotation2 = Math.PI - Math.acos(dot) - Math.PI/4;

        //Update position and rotation
        amplifier2.position.set(this.mainScene.amplifierPosition2.x, this.mainScene.amplifierPosition2.y, this.mainScene.amplifierPosition2.z);
        amplifier2.rotateY(this.mainScene.amplifierRotation2);

        //Labels
        if(mainScene.labelsOn) {
            var mirror_label = this.mainScene.scene.getObjectByName('mirror_label');
            var amplifier2_label = this.mainScene.scene.getObjectByName('amplifier2_label');

            mirror_label.position.set(this.mainScene.mirrorPosition.x, this.mainScene.mirrorPosition.y + 45 ,this.mainScene.mirrorPosition.z);
            amplifier2_label.position.set(this.mainScene.amplifierPosition2.x, this.mainScene.amplifierPosition2.y ,this.mainScene.amplifierPosition2.z);

            if(mainScene.laserOnFlag){
                var reference_beam_label = this.mainScene.scene.getObjectByName('reference_beam_label');
                var mirrorDir = mainScene.getDirMirror().clone().normalize();
                var spritey3Position = new THREE.Vector3();
                spritey3Position.addVectors(mainScene.platePosition, mirrorDir.multiplyScalar((1/Math.cos(Math.PI/4 - mainScene.referenceWaveAngle)) * 125));
                reference_beam_label.position.set(spritey3Position.x, spritey3Position.y + 50 , spritey3Position.z);
            }
        }

        //Reset reflected geometry
        var laserLight3 = this.mainScene.getLaserLight3();
        var i;
        for(i = 0; i < laserLight3.length; i++){
            this.mainScene.scene.remove(laserLight3[i]);
        }
        this.mainScene.eraseLight3Array();

        this.mainScene.getMirrorPoints();
        this.mainScene.laserDupliateShader.uniforms.mirror.value = this.mainScene.mirrorPoints;
        this.mainScene.laserDupliateShader.uniforms.referenceWaveAngle.value = this.mainScene.referenceWaveAngle;
        this.mainScene.laserReflectionShader.uniforms.mirror.value = this.mainScene.mirrorPoints;
        this.mainScene.laserReflectionShader.uniforms.referenceWaveAngle.value = this.mainScene.referenceWaveAngle;

        //if simple laser is on then it needs to be updated
        if(this.mainScene.simpleLaserOn) {
            var laserB_M = this.mainScene.scene.getObjectByName('simpleLaserBeam');
            var middleB_M = new THREE.Vector3();
            middleB_M.subVectors(this.mainScene.mirrorPosition, this.mainScene.beamSplitterPosition).divideScalar(2);
            var unitsB_M = this.mainScene.mirrorPosition.distanceTo(this.mainScene.beamSplitterPosition);
            laserB_M.geometry = new THREE.CylinderGeometry(10, 10, unitsB_M, 32);
            laserB_M.position.set(this.mainScene.mirrorPosition.x - middleB_M.x, this.mainScene.mirrorPosition.y - middleB_M.y, this.mainScene.mirrorPosition.z - middleB_M.z);

            var middleM_AP2 = new THREE.Vector3();
            middleM_AP2.subVectors(this.mainScene.amplifierPosition2, this.mainScene.mirrorPosition).divideScalar(2);
            var unitsM_AP2 = this.mainScene.mirrorPosition.distanceTo(this.mainScene.amplifierPosition2);
            laserM_AP2.geometry = new THREE.CylinderGeometry(10, 10, unitsM_AP2, 32);
            laserM_AP2.position.set(this.mainScene.amplifierPosition2.x - middleM_AP2.x, this.mainScene.amplifierPosition2.y - middleM_AP2.y, this.mainScene.amplifierPosition2.z - middleM_AP2.z);
            laserM_AP2.rotateZ(this.mainScene.amplifierRotation2);

            var newLaser3Finish = new THREE.Vector3();
            newLaser3Finish.addVectors(this.mainScene.mirrorPosition, negDirMirror.clone().normalize().multiplyScalar((1 / Math.cos(Math.PI / 4 - this.mainScene.referenceWaveAngle)) * 350));
            var unitsAP2_P = newLaser3Finish.distanceTo(this.mainScene.amplifierPosition2);
            var middleAP2_P = new THREE.Vector3();
            middleAP2_P.subVectors(newLaser3Finish, this.mainScene.amplifierPosition2).divideScalar(2);
            laserAP2_P.geometry = new THREE.CylinderGeometry(110, 10, unitsAP2_P, 32);
            laserAP2_P.position.set(newLaser3Finish.x - middleAP2_P.x, newLaser3Finish.y - middleAP2_P.y, newLaser3Finish.z - middleAP2_P.z);
            laserAP2_P.rotateZ(this.mainScene.amplifierRotation2);
        }
    },

    changeView: function( value ){
        if(value == 1) {
            this.mainScene.controls.rotateLeft(0.01);
            this.currentView += 0.01;
            //this.currentViewCoords = this.camera.getWorldPosition();
        }
        else {
            this.mainScene.controls.rotateLeft(-0.01);
            this.currentView -= 0.01;
        }
    }

};
