import { NextResponse } from "next/server";
import { handleApi } from "@/lib/server/handler";
import { apiError } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/auth";
import { getUserById } from "@/lib/server/users";
import { findUserRooms } from "@/lib/server/rooms";

export async function GET(req: Request) {
  return handleApi(req, async () => {
    const authUser = requireUser(req);

    const myUser = await getUserById(authUser.id);
    if (!myUser) throw apiError(404, "no_user");

    const { userName, email, roles, emailVerified } = myUser;

    const foundRooms = await findUserRooms(userName);
    const rooms = foundRooms.map((r) => ({
      roomName: r.roomName,
      owner: r.owner,
      users: r.users,
      gameStatus: r.game?.status,
      numPlayers: r.game?.players?.length ?? 0,
      status: r.status,
    }));

    return NextResponse.json({
      data: {
        userId: authUser.id,
        userName,
        email,
        roles,
        emailVerified,
        rooms,
      },
    });
  });
}
