import ComponentOverlayPage from "@/components/ComponentOverlayPage";
import { connectDetector } from "@/utils/connectDetector";
import { poke } from "@/utils/poke";
import supabase from "@/utils/supabase";
import { tmiClient } from "@/utils/tmi";
import type { GetServerSideProps } from "next";
import { useEffect, useState } from "react";

export default function GameOverlay({ channel }: { channel: string }) {
  const [clientConnected, setClientConnected] = useState<boolean>(false);

  useEffect(() => {
    // Check if the client and channel is connected. If not, connect to the server and set the state to true.
    if (!clientConnected || connectDetector.getConnect(channel)) {
      tmiClient.connect();
      setClientConnected(true);
    }

    tmiClient
      .on("connected", async (address) => {
        console.log(`tmi: connected to irc server(${address})`);

        if (clientConnected) {
          connectDetector.setConnect(channel); // push channel to connectings
          await poke.initialize(channel); // up to poke
          await tmiClient.join(channel); // joint to chat
        }
      })
      .on("disconnected", () => {
        console.log("tmi: disconnected to irc server");
      })
      .on("chat", async (channel, tags, message) => {
        if (!message.startsWith("!poke")) return;

        const cmd = message.slice(1).split(" ").pop()?.toLowerCase(); // remove (!) and pick up to last word as command
        const channelName = channel.slice(1) as string; // remove (#) from channel
        const userName = tags.username as string;
        console.log(userName, cmd); // remove

        // commands
        if (cmd === "welcomepack") {
          return await poke.welcomePack(tmiClient, userName, channelName);
        } else if (cmd === "attack") {
          return await poke.attack(tmiClient, userName, channelName);
        } else if (cmd === "inventory") {
          //return await poke.inventory(tmiClient, userName, channelName); // rework
        }
      });
  }, [channel, clientConnected]);

  return <ComponentOverlayPage id={channel} />;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const id = ctx.query.id as string;

  const { data } = await supabase
    .from("accounts")
    .select()
    .eq("id", id)
    .single();

  if (!data) {
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };
  }

  return {
    props: {
      channel: data.channel,
    },
  };
};
