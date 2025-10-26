// Creating engine
let engine = Matter.Engine.create();

// Creating a render and attaching it to html body
let render = Matter.Render.create({
    element: document.body,
    engine: engine,
    options: {
        // Adjusts to all screen sizes
        width: innerWidth,
        height: innerHeight,
        wireframes: false,
        background: 'transparent'
    }
});

// Platform
const slope = 0.35;

// UFO
const ufoBodyW = 250;
const ufoBodyH = 25;
const ufoImgPxW = 300;
const ufoImgPxH = 25;
const ufoScaleX = ufoBodyW / ufoImgPxW;
const ufoScaleY = ufoBodyH / ufoImgPxH;

let ufo = Matter.Bodies.trapezoid( 875, 440, ufoBodyW, ufoBodyH, slope, {
    isStatic: true,
    chamfer: { radius: 6 },
    label: 'ufoPlatform',
    render: {
        sprite: {
            texture: 'img/ufo.png',
            xScale: ufoScaleX,
            yScale: ufoScaleY
        }
    }
});

// Star and Sling
const origin = { x: 300, y: 500 };
const starRadius = 20;
const starImgPx = 200;
const starScale = ( starRadius * 2 ) / starImgPx;

function createStar( x = origin.x, y = origin.y ) {
    return Matter.Bodies.circle( x, y, starRadius, {
        label: 'playerStar',
        render: {
            sprite: {
                texture: 'img/star.png',
                xScale: starScale,
                yScale: starScale
            }
        }
    });
}
let star = createStar();
let sling = Matter.Constraint.create({
    pointA: { x: 300, y: 500 },
    bodyB: star,
    stiffness: 0.015,
    render: {
        strokeStyle: '#c09452',
        lineWidth: 2
    }
});

// Mouse
let mouse = Matter.Mouse.create( render.canvas );
let mouseConstraint = Matter.MouseConstraint.create( engine, {
    mouse: mouse,
    constraint: {
        render: { visible: false }
    }
});
render.mouse = mouse;

// Aliens
const alienRadius = 20;
const alienImgPx = 300;
const alienScale = ( alienRadius * 2 ) / alienImgPx;

const freezeAlienRotation = false;

function createAlien( x, y ) {
    const body = Matter.Bodies.polygon( x, y, 8, alienRadius, {
        label: 'targetAlien',
        render: {
            sprite: {
                texture: 'img/alien.png',
                xScale: alienScale,
                yScale: alienScale
            }
        }
    });

    if ( freezeAlienRotation ) {
        body.inertia = Infinity;
        body.inverseInertia = 0;
    }
    return body;
}
let aliens = Matter.Composites.stack( 800, 270, 4, 4, 0, 0, ( x, y ) => createAlien( x, y ) );

// Firing
let firing = false;
Matter.Events.on( mouseConstraint, 'enddrag', function( e ) {
    if ( e.body === star ) firing = true;
});
Matter.Events.on( engine, 'afterUpdate', function() {
    if ( 
        firing &&
        Math.abs( star.position.x - origin.x) < 20 &&
        Math.abs( star.position.y - origin.y ) < 20
    ) {
        star = createStar();
        Matter.World.add(engine.world, star);
        sling.bodyB = star;
        firing = false;
    }
});

// -----------------------
//      Winner Modal
// -----------------------
const ub = ufo.bounds;
const ufoWidth = ub.max.x - ub.min.x;
// Sensor
const sensor = Matter.Bodies.rectangle(
    (ub.max.x + ub.min.x) / 2,
    ub.min.y - 6,
    ufoWidth,
    12,
    {
        isStatic: true,
        isSensor: true,
        render: { visible: false }
    }
);

// Tracker
const aliensOn = new Set();
const starsOn = new Set();
const alienIds = new Set( aliens.bodies.map( b => b.id) );

function addIfRelevant( body ) {
    if ( alienIds.has( body.id ) ) aliensOn.add( body.id );
    if ( body.label === 'playerStar' ) starsOn.add( body.id );
}
function removeIfRelevant( body ) {
    if ( alienIds.has( body.id ) ) aliensOn.delete( body.id );
    if ( body.label === 'playerStar' ) starsOn.delete( body.id );
}

// Listen for collisions
Matter.Events.on( engine, 'collisionStart', ( evt ) => {
    for ( const pair of evt.pairs ) {
        if ( pair.bodyA === sensor ) addIfRelevant( pair.bodyB );
        else if ( pair.bodyB === sensor ) addIfRelevant( pair.bodyA );
    }
});
Matter.Events.on( engine, 'collisionEnd', ( evt ) => {
    for ( const pair of evt.pairs ) {
        if ( pair.bodyA === sensor ) removeIfRelevant( pair.bodyB );
        else if ( pair.bodyB === sensor ) removeIfRelevant( pair.bodyA );
    }
});
Matter.Events.on( engine, 'afterUpdate', function seedOnce() {
    Matter.Events.off( engine, 'afterUpdate', seedOnce );
    const initial = Matter.Query.collides( sensor, aliens.bodies );
    for ( const p of initial ) {
        const other = p.bodyA === sensor ? p.bodyB : p.bodyA;
        addIfRelevant( other );
    }
});

// Winner Check
let hasWon = false;
function showWinnerModal() {
    const modal = document.getElementById( 'winnerModal' );
    if ( !modal ) return;
    engine.timing.timeScale = 0;
    modal.classList.add( 'show' );

    document.getElementById( 'playAgainBtn' )?.addEventListener( 'click', () => {
        window.location.reload();
    });
    document.getElementById( 'newLevelBtn' )?.addEventListener( 'click', () => {
        window.location.href = 'cowboys-vs-aliens.html';
    });
    document.getElementById( 'quitBtn' )?.addEventListener( 'click', () => {
        window.location.href = 'cowboys-vs-aliens.html';
    });
}
Matter.Events.on( engine, 'afterUpdate', function () {
    if ( !hasWon ) {
        const isPlatformEmpty = aliensOn.size === 0;
        if ( isPlatformEmpty ) {
            hasWon = true;
            showWinnerModal();
        }
    }
});

// Horizontal Motion
const horizontalMotion = {
    minX: 600,
    maxX: 870,
    speed: 2.2,
    dir: 1
};
Matter.Events.on( engine, 'beforeUpdate', function() {
    const x = ufo.position.x;
    let nextX = x + horizontalMotion.speed * horizontalMotion.dir;

    if ( nextX < horizontalMotion.minX ) { nextX = horizontalMotion.minX; horizontalMotion.dir = 1; }
    if ( nextX > horizontalMotion.maxX ) { nextX = horizontalMotion.maxX; horizontalMotion.dir = -1; }

    const dx = nextX - x;
    if ( dx === 0 ) return;

    Matter.Body.translate( ufo, { x: dx, y: 0} );
    Matter.Body.translate( sensor, { x: dx, y: 0 } );
    Matter.Composite.translate( aliens, { x:dx, y: 0 } );
});

// Website Display
Matter.World.add( engine.world, [ aliens, ufo, sensor, star, sling, mouseConstraint ] );
Matter.Engine.run( engine );
Matter.Render.run( render );