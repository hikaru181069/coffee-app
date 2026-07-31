function SearchInput({ searchText, setSearchText }) {
  return (
    <input
      className="mx-auto mt-6 block w-full max-w-2xl transition duration-200 focus:-translate-y-0.5"
      type="text"
      placeholder="Search player name"
      value={searchText}
      onChange={(event) => setSearchText(event.target.value)}
    />
  );
}

export default SearchInput;
