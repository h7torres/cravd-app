import { Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Explore from "./pages/Explore";
import ItemDetail from "./pages/ItemDetail";
import NewInvite from "./pages/NewInvite";
import Friends from "./pages/Friends";
import Profile from "./pages/Profile";
import Blend from "./pages/Blend";
import Meal from "./pages/Meal";
import NotFound from "./pages/NotFound";
import Results from "./pages/Results";
import Messages from "./pages/Messages";
import Thread from "./pages/Thread";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/results" element={<Results />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/items/:itemId" element={<ItemDetail />} />
        <Route path="/invite/new" element={<NewInvite />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/messages/:threadId" element={<Thread />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/blend" element={<Blend />} />
        <Route path="/meal/:inviteId" element={<Meal />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
