import { vec3, vec4, quat } from '../../engine/math'

export const enum CubeFace {
    Top = 0 << 2,
    Front = 1 << 2,
    Left = 2 << 2,
    Bottom = 3 << 2,
    Back = 4 << 2,
    Right = 5 << 2
}

export const enum Direction {
    None = -1,
    Up = 0,
    Left = 1,
    Down = 2,
    Right = 3
}

export const DirectionAngle = {
    [Direction.Up]: quat.axisAngle(vec3.AXIS_Y, 0.5 * Math.PI, quat()),
    [Direction.Left]: quat.axisAngle(vec3.AXIS_Y, 1.0 * Math.PI, quat()),
    [Direction.Down]: quat.axisAngle(vec3.AXIS_Y, 1.5 * Math.PI, quat()),
    [Direction.Right]: quat.axisAngle(vec3.AXIS_Y, 2.0 * Math.PI, quat())
}

export const CubeOrientation = (face: number, direction: Direction): number => (face << 2) | direction
CubeOrientation.rotate = (orientation: number, direction: Direction): number => {
    const f = orientation >>> 2
    const d = orientation & 0x3
    return CubeOrientation(f, (4 + d + direction) % 4)
}
CubeOrientation.roll = (orientation: number, direction: Direction): number => {
    const d = orientation & 0x3
    const o = TransitionMatrix[orientation & 0x1C][(4 + direction - d) % 4]
    return CubeOrientation.rotate(o, d)
}
const TransitionMatrix = {
    [CubeFace.Top | Direction.Up]: {
        [Direction.Up]: CubeFace.Front | Direction.Up,
        [Direction.Left]: CubeFace.Right | Direction.Left,
        [Direction.Down]: CubeFace.Back | Direction.Down,
        [Direction.Right]: CubeFace.Left | Direction.Right
    },
    [CubeFace.Front | Direction.Up]: {
        [Direction.Up]: CubeFace.Bottom | Direction.Up,
        [Direction.Left]: CubeFace.Right | Direction.Up,
        [Direction.Down]: CubeFace.Top | Direction.Up,
        [Direction.Right]: CubeFace.Left | Direction.Up
    },
    [CubeFace.Left | Direction.Up]: {
        [Direction.Up]: CubeFace.Bottom | Direction.Right,
        [Direction.Left]: CubeFace.Front | Direction.Up,
        [Direction.Down]: CubeFace.Top | Direction.Left,
        [Direction.Right]: CubeFace.Back | Direction.Up
    },
    [CubeFace.Right | Direction.Up]: {
        [Direction.Up]: CubeFace.Bottom | Direction.Left,
        [Direction.Left]: CubeFace.Back | Direction.Up,
        [Direction.Down]: CubeFace.Top | Direction.Right,
        [Direction.Right]: CubeFace.Front | Direction.Up
    },
    [CubeFace.Bottom | Direction.Up]: {
        [Direction.Up]: CubeFace.Back | Direction.Down,
        [Direction.Left]: CubeFace.Right | Direction.Right,
        [Direction.Down]: CubeFace.Front | Direction.Up,
        [Direction.Right]: CubeFace.Left | Direction.Left
    },
    [CubeFace.Back | Direction.Up]: {
        [Direction.Up]: CubeFace.Bottom | Direction.Down,
        [Direction.Left]: CubeFace.Left | Direction.Up,
        [Direction.Down]: CubeFace.Top | Direction.Down,
        [Direction.Right]: CubeFace.Right | Direction.Up
    }
}