import ClickOutside from '../ClickOutside';

const DropdownNotification = () => {
  return (
    <ClickOutside
      onClick={() => setDropdownOpen(false)}
      className="relative"
    ></ClickOutside>
  );
};

export default DropdownNotification;
