import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        this.load.image('background', 'assets/background.png');
    }

    create ()
    {
        this.scene.start('Preloader');
        this.add.text(-1000,-1000,'font',{
        fontFamily:'LilitaOne'
});
    }
}
